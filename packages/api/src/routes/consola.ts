import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { zodIssuesToErrorEnvelope } from "@app/validation";
import { normalize } from "../utils/normalize";
import { receptionDayRangeUtc } from "../utils/timezone";
import { logger } from "../utils/logger";
import { prisma } from "../db/client";
import { requireAuth } from "../middleware/require-auth";

// RECEP-01..04: authenticated reception console — listing/search, detail, and
// idempotent validation of a PreRegistro. requireAuth is mounted on the whole
// router (not per-route) so every current AND future endpoint in this file is
// protected by construction (T-05-01).
export const consolaRouter = Router();

consolaRouter.use(requireAuth);

const log = logger.child({ route: "/api/consola" });

// Own contract for this router's query params — not shared via @app/validation
// since these filters are console-specific, not part of the patient-facing
// pre-registro schema.
const consolaQuerySchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  fecha: z.string().date("Fecha inválida").optional(),
});

// Explicit `select` in the nested `personal` include (T-05-03): passwordHash
// must never be selectable here, regardless of future PersonalDeRecepcion
// schema changes.
const PERSONAL_SELECT = {
  id: true,
  nombre: true,
  apellidoPaterno: true,
  apellidoMaterno: true,
} as const;

const DETAIL_INCLUDE = {
  domicilio: true,
  infoMedica: true,
  consentimiento: true,
  personal: { select: PERSONAL_SELECT },
} as const;

function parseId(raw: string) {
  return z.coerce
    .number({ error: () => "ID inválido" })
    .int()
    .positive()
    .safeParse(raw);
}

consolaRouter.get("/pre-registros", async (req, res) => {
  try {
    const parsed = consolaQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(422).json(zodIssuesToErrorEnvelope(parsed.error.issues));
      return;
    }

    const where: Prisma.PreRegistroWhereInput = {};
    if (parsed.data.nombre) {
      where.nombreBusqueda = { contains: normalize(parsed.data.nombre) };
    }
    if (parsed.data.fecha) {
      // D-07 / CR-01: the picked date is a LOCAL calendar day in the reception
      // timezone. `new Date("YYYY-MM-DD")` would parse it as UTC midnight and
      // shift the window ~6h, dropping evening submissions from their local day.
      // receptionDayRangeUtc() converts the local day to its UTC bounds.
      const { start, end } = receptionDayRangeUtc(parsed.data.fecha);
      // Day-range comparison, never exact timestamp equality.
      where.createdAt = { gte: start, lt: end };
    }

    const preRegistros = await prisma.preRegistro.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        apellidoPaterno: true,
        apellidoMaterno: true,
        curp: true,
        createdAt: true,
        validado: true,
        validadoEn: true,
      },
      orderBy: { createdAt: "desc" }, // D-11: fetch-all, no pagination in v1
    });

    log.info({ action: "list", count: preRegistros.length });
    res.json({ data: preRegistros });
  } catch (error) {
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
    log.error({ action: "list", failed: true, name: (error as Error)?.name, code });
    res.status(500).json({ error: { message: "Error interno del servidor" } });
  }
});

consolaRouter.get("/pre-registros/:id", async (req, res) => {
  try {
    const parsedId = parseId(req.params.id);
    if (!parsedId.success) {
      res.status(422).json(zodIssuesToErrorEnvelope(parsedId.error.issues));
      return;
    }

    const preRegistro = await prisma.preRegistro.findUnique({
      where: { id: parsedId.data },
      include: DETAIL_INCLUDE,
    });

    if (!preRegistro) {
      res.status(404).json({ error: { message: "Pre-registro no encontrado" } });
      return;
    }

    log.info({ action: "detail", id: parsedId.data });
    res.json({ data: preRegistro });
  } catch (error) {
    log.error({ action: "detail", failed: true, name: (error as Error)?.name });
    res.status(500).json({ error: { message: "Error interno del servidor" } });
  }
});

consolaRouter.post("/pre-registros/:id/validar", async (req, res) => {
  try {
    const parsedId = parseId(req.params.id);
    if (!parsedId.success) {
      res.status(422).json(zodIssuesToErrorEnvelope(parsedId.error.issues));
      return;
    }

    // D-04/T-05-02: the actor is ALWAYS read from the server-side session,
    // guaranteed non-null by requireAuth. Never from req.body/req.params — a
    // personalId in the request body (spoofing attempt) is silently ignored.
    const personalId = req.session.personalId as number;

    // D-03 / WR-01: the false -> true transition must be atomic. A read-then-write
    // (findUnique + branch + update) has a TOCTOU window where two concurrent
    // validate requests (double-click, retried POST, two tabs) both observe
    // validado === false and both write, so the second overwrites the first's
    // validadoEn/personalId audit trail. A conditional updateMany
    // (WHERE validado = false) makes the transition atomic: exactly one request
    // flips the row; any later call matches zero rows and leaves the original
    // audit fields untouched, which is precisely the idempotent guarantee.
    const transition = await prisma.preRegistro.updateMany({
      where: { id: parsedId.data, validado: false },
      data: { validado: true, validadoEn: new Date(), personalId },
    });

    // Re-fetch the authoritative row for the response. count === 0 means the row
    // was either already validated (idempotent replay) or does not exist — the
    // findUnique below disambiguates via 404.
    const current = await prisma.preRegistro.findUnique({
      where: { id: parsedId.data },
      include: DETAIL_INCLUDE,
    });

    if (!current) {
      res.status(404).json({ error: { message: "Pre-registro no encontrado" } });
      return;
    }

    log.info({
      action: "validate",
      id: parsedId.data,
      personalId,
      idempotent: transition.count === 0,
    });
    res.json({ data: current });
  } catch (error) {
    log.error({ action: "validate", failed: true, name: (error as Error)?.name });
    res.status(500).json({ error: { message: "Error interno del servidor" } });
  }
});
