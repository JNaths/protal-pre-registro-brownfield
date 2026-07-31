import "./env";
// NOTE: express-session.d.ts is an ambient type declaration — TypeScript picks
// it up automatically via tsconfig `include`; it must NOT be imported as a
// runtime value import (a .d.ts has no JS output and breaks under tsx/vitest).
import { fileURLToPath } from "node:url";
import express, { type ErrorRequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { healthRouter } from "./routes/health";
import { preRegistrosRouter } from "./routes/pre-registros";
import { authRouter } from "./routes/auth";
import { consolaRouter } from "./routes/consola";
import { logger } from "./utils/logger";

const { Pool } = pg;

// Fail loudly at startup if DATABASE_URL is missing (01-RESEARCH.md Pitfall 3).
// Do not echo the connection string itself — only note that it is absent
// (threat T-01-03: information disclosure via startup logs).
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check your .env.local file.");
}

// WR-03: fail closed rather than silently signing session cookies with a
// well-known, source-visible fallback secret in production. The dev fallback
// below (`dev-only-insecure-secret`) is acceptable only on localhost; in a
// production deployment a missing SESSION_SECRET is a hard misconfiguration.
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET is required in production.");
}

const app = express();

// WR-04: behind a TLS-terminating proxy / load balancer (typical for cloud
// deployments), Express sees `http` on the internal hop. Without trusting the
// proxy, express-session considers the connection insecure and refuses to set
// the `secure` cookie — so no session cookie is ever stored and production
// login silently fails. Trust the first proxy hop in production so `req.secure`
// (and `req.ip` for the rate limiter) reflect the real client connection.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(express.json());

// express-session + connect-pg-simple (D-01, D-03b): a second, SEPARATE
// pg.Pool from Prisma's (@prisma/adapter-pg) pool, both pointed at the same
// DATABASE_URL. This is an intentional, documented duplication (Pitfall 2,
// 04-RESEARCH.md) — acceptable at this project's scale. `createTableIfMissing`
// provisions the `session` table via the library's own DDL, entirely outside
// Prisma migrations (D-03b — never add a Session model to schema.prisma).
// 05-UAT: a long-lived raw pg.Pool against Neon serverless must be resilient to
// the provider terminating idle connections when its compute auto-suspends.
// Without this, the first session WRITE after a suspend hits a dead socket and
// login 500s — persistently, because the poisoned client can be handed out
// again — while Prisma's adapter pool (which sets its own connectionTimeoutMillis,
// see db/client.ts) keeps working and masks the gap on /health.
//   - keepAlive: send TCP keepalive probes so a silently-dead peer is detected
//     instead of the kernel handing us a half-open socket.
//   - idleTimeoutMillis: proactively close our OWN idle clients (well under
//     Neon's suspend window) so connections recycle cleanly instead of being
//     killed by Neon underneath us.
//   - connectionTimeoutMillis: fail fast (mirrors the Prisma adapter's 10s)
//     rather than hanging when establishing a new connection is slow.
const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  keepAlive: true,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
// An error on an IDLE pooled client is emitted on the Pool itself; with no
// listener Node treats it as an unhandled 'error' event and can crash the
// process. Log non-PII metadata and swallow — node-postgres removes the dead
// client from the pool, so the next acquire transparently creates a fresh one.
sessionPool.on("error", (err) => {
  logger.error({ action: "session_pool_idle_error", name: (err as Error)?.name });
});
const PgStore = connectPgSimple(session);

app.use(
  session({
    store: new PgStore({ pool: sessionPool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
    resave: false,
    saveUninitialized: false,
    rolling: true, // D-03: idle timeout resets on each request
    cookie: {
      httpOnly: true, // D-02: never readable by client-side JS
      sameSite: "lax", // D-02: CSRF mitigation, no separate token library in v1
      secure: process.env.NODE_ENV === "production", // Pitfall 1: false on localhost http
      maxAge: 8 * 60 * 60 * 1000, // D-03: 8h rolling idle timeout
    },
  }),
);

// GET /api/health (Plan 01-02) — Prisma-backed stack health check.
app.use("/api", healthRouter);
// POST /api/pre-registros (Plan 02-02) — validates, sanitizes, and persists
// pre-registro + consentimiento.
app.use("/api", preRegistrosRouter);
// POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout (Plan 04-01).
app.use("/api/auth", authRouter);
// GET /api/consola/pre-registros[/:id], POST /api/consola/pre-registros/:id/validar
// (Plan 05-01) — authenticated reception console, requireAuth mounted inside
// consolaRouter itself.
app.use("/api/consola", consolaRouter);

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
