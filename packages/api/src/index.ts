import "./env";
import { fileURLToPath } from "node:url";
import express, { type ErrorRequestHandler } from "express";
import { healthRouter } from "./routes/health";
import { preRegistrosRouter } from "./routes/pre-registros";
import { logger } from "./utils/logger";

// Fail loudly at startup if DATABASE_URL is missing (01-RESEARCH.md Pitfall 3).
// Do not echo the connection string itself — only note that it is absent
// (threat T-01-03: information disclosure via startup logs).
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check your .env.local file.");
}

const app = express();

app.use(express.json());

// GET /api/health (Plan 01-02) — Prisma-backed stack health check.
app.use("/api", healthRouter);
// POST /api/pre-registros (Plan 02-02) — validates, sanitizes, and persists
// pre-registro + consentimiento.
app.use("/api", preRegistrosRouter);

// Terminal error handler (WR-03). Registered AFTER routes so it catches errors
// thrown by middleware (e.g. express.json() rejecting a malformed body before
// the route runs) and by route handlers. Always responds with the JSON
// error-envelope shape used everywhere else and never leaks stack/internals.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: { message: "JSON malformado" } });
    return;
  }
  // Log non-PII metadata only — never the message/stack (may embed user data).
  logger.error({ handled: false, name: (err as Error)?.name });
  res.status(500).json({ error: { message: "Error interno del servidor" } });
};
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Only bind a port when this file is the process entry point (npm start / dev).
// When imported by supertest in health.test.ts, DO NOT listen — supertest binds
// its own ephemeral port, and an inline app.listen() here would leak an open
// handle that prevents `vitest run` from exiting cleanly.
const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

export default app;
