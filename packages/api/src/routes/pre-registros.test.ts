import { Writable } from "node:stream";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { prisma } from "../db/client";
import { setLoggerSink, resetLoggerSink } from "../utils/logger";

// Integration tests for API-01/API-02/API-03/API-05/API-06, run against the
// live Neon database (no mocking of Prisma) — mirrors health.test.ts's
// supertest pattern: import `app`, never call app.listen().

const basePayload = {
  nombre: "Juan",
  apellidoPaterno: "Pérez",
  apellidoMaterno: "García",
  fechaNacimiento: "1993-04-11",
  sexo: "H" as const,
  email: "juan.perez@example.com",
  telefono: "5512345678",
  domicilio: {
    calle: "Calle Falsa",
    numero: "123",
    colonia: "Centro",
    codigoPostal: "28001",
    estado: "Ciudad de México",
    municipio: "Benito Juárez",
  },
  infoMedica: {
    tipoSangre: "O+",
    alergias: "Penicilina",
    observaciones: "Paciente diabético",
  },
  consentimiento: true,
};

// Distinct valid CURPs (RENAPO checksum verified), one per scenario, so tests
// never collide on the unique `curp` constraint.
const CURP_UPSERT = "MOTR930411HJCRMN11";
const CURP_INVALID = "MOTR930411HJCRMN09"; // known-bad checksum fixture
const CURP_XSS = "MOTR930411HJCRMN29";
const CURP_LOG_REDACTION = "MOTR930411HJCRMN37";
const CURP_DOMICILIO_VALID = "MOTR930411HJCRMN45";
const CURP_DOMICILIO_CP_INVALID = "MOTR930411HJCRMN53";

const ALL_TEST_CURPS = [
  CURP_UPSERT,
  CURP_INVALID,
  CURP_XSS,
  CURP_LOG_REDACTION,
  CURP_DOMICILIO_VALID,
  CURP_DOMICILIO_CP_INVALID,
];

describe("POST /api/pre-registros", () => {
  beforeAll(async () => {
    // Start from a clean slate so the suite is idempotent: a stale row from an
    // interrupted prior run must not turn the "create" scenario into an "update".
    await prisma.preRegistro.deleteMany({
      where: { curp: { in: ALL_TEST_CURPS } },
    });
  });

  afterAll(async () => {
    // Never leave test rows behind in the shared Neon database.
    await prisma.preRegistro.deleteMany({
      where: { curp: { in: ALL_TEST_CURPS } },
    });
    await prisma.$disconnect();
  });

  it("creates a PreRegistro + Consentimiento with a server-generated timestamp (API-01, API-05)", async () => {
    const res = await request(app)
      .post("/api/pre-registros")
      .send({ ...basePayload, curp: CURP_UPSERT });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Registro creado");

    const row = await prisma.preRegistro.findUnique({
      where: { curp: CURP_UPSERT },
      include: { consentimiento: true },
    });

    expect(row).not.toBeNull();
    expect(row?.consentimiento?.fechaAceptacion).toBeInstanceOf(Date);
    expect(row?.consentimiento?.versionAvisoPrivacidad).toBe("1.0");
  });

  it("rejects a repeated CURP with 409 and leaves the original record UNCHANGED (CR-01(b) — no unauthenticated overwrite)", async () => {
    const firstRow = await prisma.preRegistro.findUnique({
      where: { curp: CURP_UPSERT },
      include: { consentimiento: true },
    });
    expect(firstRow).not.toBeNull();
    const firstTelefono = firstRow?.telefono;
    const firstFechaAceptacion = firstRow?.consentimiento?.fechaAceptacion;
    expect(firstFechaAceptacion).toBeDefined();

    // Ensure a measurable time delta before re-posting, so any overwrite of the
    // stored record (the CR-01(b) defect) would be detectable if it recurred.
    await new Promise((resolve) => setTimeout(resolve, 20));

    // A second submission for an existing CURP must be REJECTED, not applied.
    // CURP is not a secret, so an unauthenticated update-by-CURP would let a
    // third party tamper with another patient's medical record.
    const res = await request(app)
      .post("/api/pre-registros")
      .send({ ...basePayload, curp: CURP_UPSERT, telefono: "5599998888" });

    expect(res.status).toBe(409);
    expect(typeof res.body.error.message).toBe("string");
    expect(res.body.error.message.length).toBeGreaterThan(0);

    // The original record must be untouched: no new row, no demographic
    // overwrite, and the consent grant timestamp unchanged.
    const rows = await prisma.preRegistro.findMany({ where: { curp: CURP_UPSERT } });
    expect(rows).toHaveLength(1);

    const afterRow = await prisma.preRegistro.findUnique({
      where: { curp: CURP_UPSERT },
      include: { consentimiento: true },
    });
    expect(afterRow?.telefono).toBe(firstTelefono); // NOT the attacker's "5599998888"
    expect(afterRow?.consentimiento?.fechaAceptacion.getTime()).toBe(
      firstFechaAceptacion!.getTime(),
    );
  });

  it("rejects an invalid CURP with 422 and per-field errors, persisting nothing (API-02)", async () => {
    const res = await request(app)
      .post("/api/pre-registros")
      .send({ ...basePayload, curp: CURP_INVALID });

    expect(res.status).toBe(422);
    expect(typeof res.body.error.fields.curp).toBe("string");
    expect(res.body.error.fields.curp.length).toBeGreaterThan(0);

    const row = await prisma.preRegistro.findUnique({ where: { curp: CURP_INVALID } });
    expect(row).toBeNull();
  });

  it("rejects a payload missing nombre with 422 and a field-level error (API-02)", async () => {
    const { nombre: _nombre, ...rest } = basePayload;
    const res = await request(app)
      .post("/api/pre-registros")
      .send({ ...rest, curp: CURP_XSS });

    expect(res.status).toBe(422);
    expect(res.body.error.fields.nombre).toBeDefined();
  });

  it("sanitizes XSS payloads in nombre before persistence (API-03)", async () => {
    const res = await request(app)
      .post("/api/pre-registros")
      .send({ ...basePayload, curp: CURP_XSS, nombre: "<script>alert(1)</script>Ana" });

    expect(res.status).toBe(200);

    const row = await prisma.preRegistro.findUnique({ where: { curp: CURP_XSS } });
    expect(row?.nombre).not.toContain("<script>");
    expect(row?.nombre).toContain("Ana");
  });

  it("persists Domicilio and InfoMedica nested within PreRegistro on create (DATA-04, DATA-05)", async () => {
    const res = await request(app)
      .post("/api/pre-registros")
      .send({ ...basePayload, curp: CURP_DOMICILIO_VALID });

    expect(res.status).toBe(200);

    const row = await prisma.preRegistro.findUnique({
      where: { curp: CURP_DOMICILIO_VALID },
      include: { domicilio: true, infoMedica: true },
    });

    expect(row?.domicilio).not.toBeNull();
    expect(row?.domicilio?.calle).toBe("Calle Falsa");
    expect(row?.domicilio?.codigoPostal).toBe("28001");
    expect(row?.domicilio?.estado).toBe("Ciudad de México");

    expect(row?.infoMedica).not.toBeNull();
    expect(row?.infoMedica?.tipoSangre).toBe("O+");
    expect(row?.infoMedica?.alergias).toBe("Penicilina");
  });

  it("rejects invalid codigoPostal with 422 field error (D-06)", async () => {
    const res = await request(app)
      .post("/api/pre-registros")
      .send({
        ...basePayload,
        curp: CURP_DOMICILIO_CP_INVALID,
        domicilio: { ...basePayload.domicilio, codigoPostal: "ABC12" },
      });

    expect(res.status).toBe(422);
    expect(typeof res.body.error.fields["domicilio.codigoPostal"]).toBe("string");
    expect(res.body.error.fields["domicilio.codigoPostal"].length).toBeGreaterThan(0);

    const row = await prisma.preRegistro.findUnique({
      where: { curp: CURP_DOMICILIO_CP_INVALID },
    });
    expect(row).toBeNull();
  });

  it("never emits curp/nombre/email/telefono in plaintext logs during the request (API-06)", async () => {
    // WR-02: capture the SINGLETON logger's real output by redirecting its
    // swappable sink (setLoggerSink), instead of monkey-patching
    // process.stdout.write after the pino sink is already bound at import time
    // (which captured nothing and made every assertion vacuous). This mirrors
    // the injected-destination pattern proven in logger.test.ts.
    const chunks: string[] = [];
    const captureStream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    });

    setLoggerSink(captureStream);
    try {
      await request(app)
        .post("/api/pre-registros")
        .send({ ...basePayload, curp: CURP_LOG_REDACTION });
    } finally {
      resetLoggerSink();
    }

    const logged = chunks.join("");
    // Guard against the previous vacuous failure mode: the route logs
    // { action: "create", ... } on success, so the capture MUST be non-empty.
    // If this is empty the test is not actually observing the logger.
    expect(logged.length).toBeGreaterThan(0);
    expect(logged).toContain('"action":"create"');
    // The route must never surface PII field values in its logs.
    expect(logged).not.toContain(CURP_LOG_REDACTION);
    expect(logged).not.toContain(basePayload.nombre);
    expect(logged).not.toContain(basePayload.email);
    expect(logged).not.toContain(basePayload.telefono);
    expect(logged).not.toContain(basePayload.domicilio.calle);
    expect(logged).not.toContain(basePayload.infoMedica.alergias);
  });
});
