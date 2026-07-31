import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { prisma } from "../db/client";
import { hashPassword } from "../utils/hash";
import { normalize } from "../utils/normalize";

// Integration tests for RECEP-01/02/03/04 (D-04, D-06, D-07, D-11), run
// against the live Neon database — mirrors auth.test.ts's request.agent(app)
// pattern for authenticated multi-request flows and pre-registros.test.ts's
// beforeAll/afterAll fixture-cleanup-by-unique-key pattern.

const STAFF_EMAIL = "consola-test-recepcion@example.com";
const STAFF_PASSWORD = "Secreta123!";

const CURP_ORDER_1 = "CONSOLA000000HDFXXA1";
const CURP_ORDER_2 = "CONSOLA000000HDFXXA2";
const CURP_SEARCH_PENA = "CONSOLA000000HDFXXA3";
const CURP_SEARCH_OTHER = "CONSOLA000000HDFXXA4";
const CURP_OTHER_DAY = "CONSOLA000000HDFXXA5";
const CURP_DETAIL = "CONSOLA000000HDFXXA6";
const CURP_VALIDATE = "CONSOLA000000HDFXXA7";

const ALL_TEST_CURPS = [
  CURP_ORDER_1,
  CURP_ORDER_2,
  CURP_SEARCH_PENA,
  CURP_SEARCH_OTHER,
  CURP_OTHER_DAY,
  CURP_DETAIL,
  CURP_VALIDATE,
];

const NONEXISTENT_ID = 999999999;

function baseFixture(overrides: {
  curp: string;
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
}) {
  const nombre = overrides.nombre ?? "Ana";
  const apellidoPaterno = overrides.apellidoPaterno ?? "Gomez";
  const apellidoMaterno = overrides.apellidoMaterno ?? "Ruiz";
  return {
    curp: overrides.curp,
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    fechaNacimiento: new Date("1990-01-01"),
    sexo: "H",
    email: `${overrides.curp.toLowerCase()}@example.com`,
    telefono: "5511122233",
    nombreBusqueda: normalize(`${nombre} ${apellidoPaterno} ${apellidoMaterno}`),
  };
}

describe("Consola routes (/api/consola)", () => {
  let detailId: number;
  let validateId: number;
  let firstValidadoEn: string;

  beforeAll(async () => {
    await prisma.personalDeRecepcion.deleteMany({ where: { email: STAFF_EMAIL } });
    await prisma.personalDeRecepcion.create({
      data: {
        email: STAFF_EMAIL,
        nombre: "Bea",
        apellidoPaterno: "Recepcion",
        apellidoMaterno: "Consola",
        telefono: "5559876543",
        activo: true,
        passwordHash: await hashPassword(STAFF_PASSWORD),
      },
    });

    await prisma.preRegistro.deleteMany({ where: { curp: { in: ALL_TEST_CURPS } } });

    await prisma.preRegistro.create({
      data: baseFixture({ curp: CURP_ORDER_1, apellidoPaterno: "Perez" }),
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await prisma.preRegistro.create({
      data: baseFixture({ curp: CURP_ORDER_2, apellidoPaterno: "Torres" }),
    });

    await prisma.preRegistro.create({
      data: baseFixture({
        curp: CURP_SEARCH_PENA,
        nombre: "José",
        apellidoPaterno: "Peña",
      }),
    });
    await prisma.preRegistro.create({
      data: baseFixture({ curp: CURP_SEARCH_OTHER, apellidoPaterno: "Sanchez" }),
    });

    const otherDayFixture = await prisma.preRegistro.create({
      data: baseFixture({ curp: CURP_OTHER_DAY, apellidoPaterno: "Ramirez" }),
    });
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    await prisma.preRegistro.update({
      where: { id: otherDayFixture.id },
      data: { createdAt: tenDaysAgo },
    });

    const detailFixture = await prisma.preRegistro.create({
      data: {
        ...baseFixture({ curp: CURP_DETAIL }),
        domicilio: {
          create: {
            calle: "Calle Uno",
            numero: "10",
            colonia: "Centro",
            codigoPostal: "12345",
            estado: "Ciudad de México",
            municipio: "Benito Juárez",
          },
        },
        infoMedica: { create: { tipoSangre: "O+", alergias: null, observaciones: null } },
        consentimiento: {
          create: { aceptado: true, versionAvisoPrivacidad: "1.0" },
        },
      },
    });
    detailId = detailFixture.id;

    const validateFixture = await prisma.preRegistro.create({
      data: baseFixture({ curp: CURP_VALIDATE }),
    });
    validateId = validateFixture.id;
  });

  afterAll(async () => {
    await prisma.preRegistro.deleteMany({ where: { curp: { in: ALL_TEST_CURPS } } });
    await prisma.personalDeRecepcion.deleteMany({ where: { email: STAFF_EMAIL } });
    await prisma.$disconnect();
  });

  it("GET /api/consola/pre-registros sin sesión responde 401", async () => {
    const res = await request(app).get("/api/consola/pre-registros");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { message: "No autenticado" } });
  });

  it("GET /api/consola/pre-registros con sesión devuelve el listado ordenado por createdAt DESC (RECEP-01)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });

    const res = await agent.get("/api/consola/pre-registros");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);

    const curps: string[] = res.body.data.map((row: { curp: string }) => row.curp);
    const indexOrder1 = curps.indexOf(CURP_ORDER_1);
    const indexOrder2 = curps.indexOf(CURP_ORDER_2);
    expect(indexOrder1).toBeGreaterThanOrEqual(0);
    expect(indexOrder2).toBeGreaterThanOrEqual(0);
    // CURP_ORDER_2 was created AFTER CURP_ORDER_1, so it must sort earlier
    // (DESC by createdAt).
    expect(indexOrder2).toBeLessThan(indexOrder1);
  });

  it("GET /api/consola/pre-registros?nombre=pena encuentra por apellido normalizado, sin acentos (RECEP-02, D-05/D-06)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });

    const res = await agent.get("/api/consola/pre-registros").query({ nombre: "pena" });

    expect(res.status).toBe(200);
    const curps: string[] = res.body.data.map((row: { curp: string }) => row.curp);
    expect(curps).toContain(CURP_SEARCH_PENA);
    expect(curps).not.toContain(CURP_SEARCH_OTHER);
  });

  it("GET /api/consola/pre-registros?fecha=hoy incluye registros de hoy y excluye los de otro día (RECEP-02, D-07)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });

    const today = new Date().toISOString().slice(0, 10);
    const res = await agent.get("/api/consola/pre-registros").query({ fecha: today });

    expect(res.status).toBe(200);
    const curps: string[] = res.body.data.map((row: { curp: string }) => row.curp);
    expect(curps).toContain(CURP_ORDER_1);
    expect(curps).not.toContain(CURP_OTHER_DAY);
  });

  it("GET /api/consola/pre-registros/:id con sesión devuelve el detalle anidado sin passwordHash (RECEP-03)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });

    const res = await agent.get(`/api/consola/pre-registros/${detailId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.domicilio).toMatchObject({ calle: "Calle Uno" });
    expect(res.body.data.infoMedica).toMatchObject({ tipoSangre: "O+" });
    expect(res.body.data.consentimiento).toMatchObject({ aceptado: true });
    expect(res.body.data.personal).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("GET /api/consola/pre-registros/:id inexistente responde 404 (RECEP-03)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });

    const res = await agent.get(`/api/consola/pre-registros/${NONEXISTENT_ID}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Pre-registro no encontrado" } });
  });

  it("GET /api/consola/pre-registros/abc (id no numérico) responde 422 con error.fields", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });

    const res = await agent.get("/api/consola/pre-registros/abc");

    expect(res.status).toBe(422);
    expect(res.body.error.fields).toBeDefined();
  });

  it("POST /api/consola/pre-registros/:id/validar sin sesión responde 401", async () => {
    const res = await request(app).post(`/api/consola/pre-registros/${validateId}/validar`);

    expect(res.status).toBe(401);
  });

  it("POST /api/consola/pre-registros/:id/validar con sesión marca validado=true con el actor de la sesión, ignorando personalId del body (RECEP-04, D-04)", async () => {
    const agent = request.agent(app);
    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });
    const sessionPersonalId = loginRes.body.id;

    const res = await agent
      .post(`/api/consola/pre-registros/${validateId}/validar`)
      .send({ personalId: sessionPersonalId + 9999 }); // spoofing attempt

    expect(res.status).toBe(200);
    expect(res.body.data.validado).toBe(true);
    expect(res.body.data.validadoEn).toEqual(expect.any(String));
    expect(res.body.data.personal.id).toBe(sessionPersonalId);

    firstValidadoEn = res.body.data.validadoEn;
  });

  it("POST /api/consola/pre-registros/:id/validar es idempotente: una segunda llamada no reescribe validadoEn (D-03)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });

    const res = await agent.post(`/api/consola/pre-registros/${validateId}/validar`);

    expect(res.status).toBe(200);
    expect(res.body.data.validado).toBe(true);
    expect(res.body.data.validadoEn).toBe(firstValidadoEn);
  });

  it("POST /api/consola/pre-registros/:id/validar inexistente responde 404 (RECEP-04)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: STAFF_EMAIL, password: STAFF_PASSWORD });

    const res = await agent.post(`/api/consola/pre-registros/${NONEXISTENT_ID}/validar`);

    expect(res.status).toBe(404);
  });
});
