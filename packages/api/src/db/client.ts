import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 requires a driver adapter — PrismaClient can no longer be
// constructed with zero arguments (schema.prisma no longer carries the
// datasource `url`; see prisma.config.ts and https://pris.ly/d/adapter-pg).
//
// `connectionTimeoutMillis` bounds how long the underlying `pg.Pool` waits
// for a new connection to establish before failing. Without it, node-postgres
// defaults to `0` (no limit) — see debug session
// .planning/debug/resolved/timeout-pre-registro.md. DATABASE_URL points at a
// Neon serverless Postgres instance, which auto-suspends its compute after a
// period of inactivity; the first query after a suspend pays a "cold start"
// (documented median ~1.8s, p95 ~2.6s, worst case ~3.1s+) while the compute
// wakes up. With no timeout configured anywhere in the stack, that wait was
// unbounded: a slow wake-up (or any other connection stall) hung the request
// indefinitely instead of failing fast, so an intermittent, first-request-
// after-idle timeout was reported. 10s covers the documented worst case with
// margin; on timeout the existing generic catch in routes/pre-registros.ts
// returns a 500 that the frontend already surfaces as a retry-able error —
// an immediate retry hits the now-warm compute and succeeds quickly.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
});

// Singleton Prisma client — this is the ONLY file allowed to instantiate
// PrismaClient. Every route/module must import `prisma` from here instead
// of creating a new instance, to avoid exhausting database connections.
export const prisma = new PrismaClient({ adapter });
