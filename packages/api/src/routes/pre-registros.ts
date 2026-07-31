import { Router } from "express";
import { Prisma } from "@prisma/client";
import { preRegistroSchema, zodIssuesToErrorEnvelope } from "@app/validation";
import { sanitizeField } from "../utils/sanitize";
import { logger } from "../utils/logger";
import { prisma } from "../db/client";
import { createRateLimit } from "../middleware/rate-limit";

const VERSION_AVISO_PRIVACIDAD = "1.0";

// WR-06: per-IP throttle for the public, unauthenticated write endpoint. The
// window/limit is a conservative default — confirm exact values with product.
const preRegistroRateLimit = createRateLimit({ windowMs: 60_000, max: 20 });

export const preRegistrosRouter = Router();

const log = logger.child({ route: "/api/pre-registros" });

type PreRegistroInput = {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  sexo: "H" | "M" | "X";
  curp: string;
  rfc?: string;
  email: string;
  telefono: string;
  domicilio: {
    calle: string;
    numero: string;
    colonia: string;
    codigoPostal: string;
    estado: string;
    municipio: string;
  };
  infoMedica?: {
    tipoSangre?: string;
    alergias?: string;
    observaciones?: string;
  };
  consentimiento: boolean;
};

// CR-01(b): the public, unauthenticated endpoint CREATES only. A `curp` that
// already exists is a 409 Conflict — never a silent overwrite. CURP is not a
// secret (it appears on everyday documents), so allowing an unauthenticated
// update-by-CURP would let anyone tamper with another patient's medical record
// (broken object-level authorization / IDOR). Corrections to an existing record
// must be routed through the authenticated reception console (Phase 4/5).
class DuplicateCurpError extends Error {
  constructor() {
    super("DUPLICATE_CURP");
    this.name = "DuplicateCurpError";
  }
}

// Creates PreRegistro + nested Domicilio/InfoMedica/Consentimiento. A single
// nested `create` is all-or-nothing in Prisma, so no explicit transaction is
// needed. The `curp` unique constraint is the authoritative guard: a duplicate —
// whether already-committed or a concurrent create race (P2002) — surfaces as
// DuplicateCurpError, which the handler maps to 409.
async function createPreRegistro(data: PreRegistroInput) {
  try {
    return await prisma.preRegistro.create({
      data: {
        nombre: data.nombre,
        apellidoPaterno: data.apellidoPaterno,
        apellidoMaterno: data.apellidoMaterno,
        fechaNacimiento: new Date(data.fechaNacimiento),
        sexo: data.sexo,
        curp: data.curp,
        rfc: data.rfc ?? null,
        email: data.email,
        telefono: data.telefono,
        domicilio: {
          create: {
            calle: data.domicilio.calle,
            numero: data.domicilio.numero,
            colonia: data.domicilio.colonia,
            codigoPostal: data.domicilio.codigoPostal,
            estado: data.domicilio.estado,
            municipio: data.domicilio.municipio,
          },
        },
        infoMedica: {
          create: {
            tipoSangre: data.infoMedica?.tipoSangre ?? null,
            alergias: data.infoMedica?.alergias ?? null,
            observaciones: data.infoMedica?.observaciones ?? null,
          },
        },
        consentimiento: {
          create: {
            aceptado: data.consentimiento,
            fechaAceptacion: new Date(),
            versionAvisoPrivacidad: VERSION_AVISO_PRIVACIDAD,
          },
        },
      },
      include: { domicilio: true, infoMedica: true, consentimiento: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DuplicateCurpError();
    }
    throw error;
  }
}

preRegistrosRouter.post("/pre-registros", preRegistroRateLimit, async (req, res) => {
  try {
    const parsed = preRegistroSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json(zodIssuesToErrorEnvelope(parsed.error.issues));
      return;
    }

    // Sanitize free-text fields before persistence (API-03, T-02-03, T-03-06).
    // Other fields are already format-validated by their respective schemas.
    const sanitized: PreRegistroInput = {
      ...parsed.data,
      nombre: sanitizeField(parsed.data.nombre),
      apellidoPaterno: sanitizeField(parsed.data.apellidoPaterno),
      apellidoMaterno: sanitizeField(parsed.data.apellidoMaterno),
      domicilio: {
        ...parsed.data.domicilio,
        calle: sanitizeField(parsed.data.domicilio.calle),
        numero: sanitizeField(parsed.data.domicilio.numero),
        colonia: sanitizeField(parsed.data.domicilio.colonia),
        municipio: sanitizeField(parsed.data.domicilio.municipio),
      },
      infoMedica: parsed.data.infoMedica
        ? {
            ...parsed.data.infoMedica,
            alergias:
              parsed.data.infoMedica.alergias !== undefined
                ? sanitizeField(parsed.data.infoMedica.alergias)
                : undefined,
            observaciones:
              parsed.data.infoMedica.observaciones !== undefined
                ? sanitizeField(parsed.data.infoMedica.observaciones)
                : undefined,
          }
        : undefined,
    };

    // Defense-in-depth: re-validate the sanitized object in case
    // sanitization emptied a required field.
    const revalidated = preRegistroSchema.safeParse(sanitized);
    if (!revalidated.success) {
      res.status(422).json(zodIssuesToErrorEnvelope(revalidated.error.issues));
      return;
    }

    const preRegistro = await createPreRegistro(sanitized);

    log.info({ action: "create", id: preRegistro.id });

    res.status(200).json({
      success: true,
      message: "Registro creado",
      id: preRegistro.id,
      createdAt: preRegistro.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof DuplicateCurpError) {
      // CR-01(b): an existing CURP is a conflict, never a silent overwrite.
      // Distinct from the generic 500 so the client can show a specific,
      // non-alarming message and route the patient to reception.
      res.status(409).json({
        error: {
          message:
            "Ya existe un pre-registro con este CURP. Acude a recepción para actualizar tus datos.",
        },
      });
      return;
    }
    // Log non-PII diagnostics only: the error message/stack may embed user
    // data, so we surface just the error name and (for known Prisma errors)
    // the stable error code. This gives operators an incident signal without
    // leaking PII (WR-04).
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : undefined;
    log.error({
      action: "upsert",
      failed: true,
      name: (error as Error)?.name,
      code,
    });
    res.status(500).json({ error: { message: "Error interno del servidor" } });
  }
});
