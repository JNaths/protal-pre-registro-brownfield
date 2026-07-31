<!-- generated-by: gsd-doc-writer -->

# Configuration

This document describes all configuration mechanisms for the Portal de Pre-registro de Pacientes, including environment variables, Prisma database setup, and development runtime settings.

## Environment Variables

Environment variables are loaded from `.env.local` at the monorepo root for the packages/api server. The `packages/api/src/env.ts` module loads this file at module-import time, before database client initialization, ensuring `DATABASE_URL` is available before Prisma connects.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string for pooled connections at runtime. Must include `?sslmode=require` and `&channel_binding=require` for Neon. Format: `postgresql://user:password@host:port/db?params`. <!-- VERIFY: Neon pool configuration and actual host URL --> |
| `DIRECT_URL` | Yes | — | PostgreSQL connection string for **non-pooled** direct connections used by Prisma migrations. Required because Neon's PgBouncer pooler does not support session-level statements that migrations issue. Same format as `DATABASE_URL` but pointing to the direct endpoint. <!-- VERIFY: Neon direct endpoint URL and credentials --> |
| `PORT` | No | `3000` | HTTP port the API server binds to. Used by Express when the `index.ts` file is the process entry point. |

### Example Environment Setup

Create a `.env.local` file in the monorepo root (not committed) from the `.env.example` template:

```bash
# Copy the template
cp .env.example .env.local

# Edit .env.local with your values
DATABASE_URL=postgresql://user:password@localhost:5432/portal_preregistro?sslmode=require&channel_binding=require
DIRECT_URL=postgresql://user:password@localhost:5432/portal_preregistro?sslmode=require&channel_binding=require
PORT=3000
```

### Required vs Optional

- **Required at API startup**: `DATABASE_URL` — the API server startup fails immediately with `"DATABASE_URL is not set — check your .env.local file."` if missing. (`DIRECT_URL` is **not** validated at API startup.)
- **Required for migrations**: `DIRECT_URL` — the non-pooled connection Prisma uses for `migrate`/DDL. Missing it does not block the API server but will break `npm run db:migrate`.
- **Optional**: `PORT` — defaults to `3000` if not set.

## Configuration Files

### prisma.config.ts (Prisma 7)

The root-level `prisma.config.ts` file is Prisma 7's new configuration mechanism. The `schema.prisma` file no longer carries the datasource URL; instead, this file defines both pooled (runtime) and direct (migration) connections.

```typescript
// Root level file: prisma.config.ts
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,           // Pooled connection for runtime
    directUrl: process.env.DIRECT_URL,       // Direct connection for migrations
  },
});
```

**Why two URLs?**

- **DATABASE_URL (pooled)**: Used by `PrismaClient` at runtime via the `@prisma/adapter-pg` driver adapter. Neon's PgBouncer pooler reduces the number of simultaneous connections to PostgreSQL.
- **DIRECT_URL (direct, non-pooled)**: Required for `prisma migrate` commands because PgBouncer does not support session-level transaction management (DDL statements). Prisma uses this URL for schema migrations only.

### Database Connection (packages/api/src/db/client.ts)

The API initializes a singleton Prisma client with the `@prisma/adapter-pg` driver adapter:

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

This is the **only** file allowed to instantiate `PrismaClient`. All routes import `prisma` from here to avoid exhausting database connections.

### Vite Development Proxy (packages/web/vite.config.ts)

The web package proxies API requests from the Vite dev server (port 5173) to the Express API (port 3000):

```typescript
server: {
  proxy: {
    "/api": {
      target: "http://localhost:3000",
      changeOrigin: true,
    },
  },
}
```

When running `npm run dev`, the web app makes requests to `fetch("/api/...")` which are automatically forwarded to `http://localhost:3000/api/...` via this proxy.

## Docker Compose Services

The `docker-compose.yml` file defines a local PostgreSQL 16 service for development:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: portal
      POSTGRES_PASSWORD: portal
      POSTGRES_DB: portal_preregistro
    ports:
      - "5432:5432"
    volumes:
      - portal_postgres_data:/var/lib/postgresql/data
```

### Starting Local PostgreSQL

```bash
npm run docker:up
```

This starts a PostgreSQL container accessible at `localhost:5432` with credentials:
- **User**: `portal`
- **Password**: `portal`
- **Database**: `portal_preregistro`

The `portal_postgres_data` volume persists the database across container restarts.

**Important**: These placeholder credentials are for **local development only**. Never reuse them for production or cloud deployments.

## Rate Limiting

The public `POST /api/pre-registros` endpoint (pre-registro creation) is protected by an in-memory per-IP rate limiter:

```typescript
// packages/api/src/routes/pre-registros.ts
const preRegistroRateLimit = createRateLimit({ windowMs: 60_000, max: 20 });
```

- **Window**: 60 seconds (60,000 milliseconds)
- **Max requests**: 20 per IP per window
- **Storage**: In-memory (does **not** coordinate across multiple processes)

When a client exceeds the limit, the server responds with HTTP 429 (Too Many Requests) and a `Retry-After` header.

### Production Scaling Caveat

The in-memory rate limiter is suitable for **single-process local development and small deployments only**. For production or horizontally-scaled deployments:

1. Replace with `express-rate-limit` backed by a shared store (Redis, Memcached).
2. Enable `app.set("trust proxy", ...)` in the Express app so `req.ip` reflects the real client IP behind a load balancer or reverse proxy.

## Per-Package TypeScript Configuration

Each workspace package has a `tsconfig.json` that extends the root config and declares project references:

| Package | tsconfig.json | References |
|---------|---------------|-----------|
| `packages/api` | `rootDir: src`, `outDir: dist` | `../validation` |
| `packages/web` | `rootDir: src`, `outDir: dist` | `../validation` |
| `packages/validation` | `rootDir: src`, `outDir: dist` | — |

The root `tsconfig.json` defines `baseUrl` and path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/validation": ["packages/validation/src"]
    }
  }
}
```

This allows the API and web packages to import validation schemas with `import { ... } from "@app/validation"` instead of relative paths.

## .gitignore Configuration

The `.gitignore` file commits the migration directory and `.env.example` template while excluding local environment files:

```
node_modules/
dist/
*.tsbuildinfo
.env
.env.local

# Prisma migrations and .env.example MUST stay tracked
!prisma/migrations/
!.env.example
```

**Key rule**: Never commit `.env`, `.env.local`, or any file with real database credentials. The example template `.env.example` is committed so new contributors can copy and customize it.

## Development vs Production

| Setting | Development | Production |
|---------|-------------|-----------|
| **DATABASE_URL** | Local PostgreSQL (docker-compose) or Neon pooled | Neon pooled endpoint <!-- VERIFY: Production Neon cluster info --> |
| **DIRECT_URL** | Local PostgreSQL or Neon direct | Neon direct endpoint <!-- VERIFY: Production Neon direct endpoint --> |
| **PORT** | 3000 (or custom via env var) | <!-- VERIFY: Production port binding and reverse proxy config --> |
| **Rate limit** | In-memory (single process) | <!-- VERIFY: Production rate limiter (Redis/Memcached) and coordinates --> |
| **CORS** | Not configured (development only) | <!-- VERIFY: Production CORS origins and allowed headers --> |

See DEPLOYMENT.md for production environment variable setup and infrastructure details.
