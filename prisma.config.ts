import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 config file (schema.prisma "datasource.url" is no longer
// supported for CLI commands — connection info for `prisma migrate` /
// `prisma db` commands now lives here; PrismaClient's runtime connection
// is configured separately via a driver adapter, see packages/api/src/db/client.ts).
//
// Read directly from process.env (not the `env()` config helper) so that
// `prisma generate` keeps working before a developer has set up DATABASE_URL
// locally (see .planning user_setup: PostgreSQL). Commands that need a real
// connection (`prisma migrate dev`, `prisma db push`) will still fail loudly
// with Prisma's own "DATABASE_URL not found" error if it's unset.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Runtime/pooled connection (used by `prisma db` inspection commands).
    url: process.env.DATABASE_URL,
    // Direct (non-pooled) connection for `prisma migrate` — Neon requires a
    // direct connection for migrations because the pooler (PgBouncer) does not
    // support the session-level statements migrations issue. Prisma 7 moved
    // `directUrl` out of schema.prisma into this config file (see P1012).
    directUrl: process.env.DIRECT_URL,
  },
});
