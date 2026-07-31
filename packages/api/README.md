<!-- generated-by: gsd-doc-writer -->

# @app/api

Express backend for the pre-registration intake system. Exposes public endpoints for patient pre-registration and health checks, with built-in input sanitization, rate limiting, and PII-safe logging.

**Part of the [Portal de Pre-registro de Pacientes](../README.md) monorepo.**

## Purpose

`@app/api` is the backend service that:

- **Accepts patient pre-registrations** via a public HTTP endpoint
- **Validates and sanitizes** all user input to prevent XSS and injection attacks
- **Persists data** to PostgreSQL using Prisma with parameterized queries (SQL-injection safe)
- **Logs safely** by redacting all PII fields
- **Rate-limits** the public write endpoint to prevent spam/resource exhaustion
- **Checks system health** to verify database connectivity

The API is consumed by the patient-facing web form (frontend) and the authenticated reception console (Phase 4).

## Installation & Setup

```bash
# Install dependencies (from the monorepo root)
npm install

# Or install just this package (not typical in a monorepo)
npm install --workspace=packages/api
```

## Endpoints

### `POST /api/pre-registros`

Creates a new patient pre-registration record with consent.

**Request body** (validated by `@app/validation`):
```json
{
  "nombre": "Juan",
  "apellidoPaterno": "García",
  "apellidoMaterno": "López",
  "fechaNacimiento": "1990-01-15",
  "sexo": "H",
  "curp": "GARL900115HDFMNN01",
  "rfc": "GARL9001151A2",
  "email": "juan@example.com",
  "telefono": "+5255551234567",
  "domicilio": {
    "calle": "Avenida Principal",
    "numero": "123",
    "colonia": "Centro",
    "codigoPostal": "06500",
    "estado": "CDMX",
    "municipio": "Cuauhtémoc"
  },
  "infoMedica": {
    "tipoSangre": "O+",
    "alergias": "Penicilina",
    "observaciones": "Sin enfermedades crónicas"
  },
  "consentimiento": true
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Registro creado",
  "id": "uuid-here",
  "createdAt": "2026-07-31T12:34:56.000Z"
}
```

**Error codes:**
- **409 Conflict** — A pre-registration with this CURP already exists
- **422 Unprocessable Entity** — Validation failed (invalid format, missing required fields)
- **429 Too Many Requests** — Rate limit exceeded (20 requests per 60 seconds per IP)
- **500 Internal Server Error** — Database or server error (no details leaked)

### `GET /api/health`

System health check. Verifies Express, Prisma, and PostgreSQL are connected.

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-07-31T12:34:56.000Z",
  "database": "connected",
  "uptime": 1234.56
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "error",
  "timestamp": "2026-07-31T12:34:56.000Z"
}
```

## Key Dependencies

- **express** — HTTP server framework
- **@prisma/client** — TypeScript ORM for database access
- **@prisma/adapter-pg** — PostgreSQL driver adapter for Prisma 7
- **@app/validation** — Shared validation schemas (Zod-based CURP, RFC, email validation)
- **pino** — Structured logging with PII redaction
- **sanitize-html** — XSS prevention (strips HTML tags while preserving text)
- **dotenv** — Environment variable loading

**Dev dependencies:**
- **tsx** — TypeScript runtime for development (`npm run dev`)
- **typescript** — Language & type checking
- **vitest** — Test runner and assertion library
- **supertest** — HTTP assertion library for testing Express routes

## Directory Structure

```
src/
├── index.ts              # Express app entry point; error handler; PORT startup
├── env.ts                # Load DATABASE_URL from .env.local at module load time
├── routes/
│   ├── health.ts         # GET /api/health endpoint
│   ├── health.test.ts    # Health endpoint unit tests
│   ├── pre-registros.ts  # POST /api/pre-registros endpoint
│   └── pre-registros.test.ts  # Pre-registration validation, sanitization, DB tests
├── middleware/
│   └── rate-limit.ts     # Per-IP fixed-window rate limiter (in-memory)
├── db/
│   └── client.ts         # Singleton Prisma client (must be imported by all routes)
└── utils/
    ├── sanitize.ts       # sanitizeField() — XSS prevention via sanitize-html
    ├── sanitize.test.ts  # Tests for sanitization (accents, ñ, entities)
    ├── logger.ts         # createLogger() and singleton logger with PII redaction
    └── logger.test.ts    # Logger redaction tests
```

## Running

### Development

```bash
npm run dev
```

Runs the server with hot reload using `tsx watch`. Loads `DATABASE_URL` from `.env.local`.

```
API server running on http://localhost:3000
```

### Build

```bash
npm run build
```

TypeScript compilation to `dist/`. Requires that `DATABASE_URL` is available at compile time (it's not — the error handler at runtime will catch a missing URL at startup).

### Production

```bash
npm start
```

Runs the compiled server from `dist/index.js`. Requires `DATABASE_URL` and `PORT` environment variables.

## Testing

```bash
npm test
```

Runs all `.test.ts` files in `src/` using Vitest:

- **health.test.ts** — Verifies health endpoint returns 200/503 correctly
- **pre-registros.test.ts** — Tests validation, sanitization, duplicate CURP handling, rate limiting
- **sanitize.test.ts** — Tests XSS prevention (HTML stripping, entity decoding)
- **logger.test.ts** — Tests PII redaction masks sensitive fields

## Environment Variables

Loaded from `packages/api/.env.local`:

- **DATABASE_URL** (required) — PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/dbname`)
- **PORT** (optional) — Server port; defaults to `3000`
- **LOG_LEVEL** (optional) — Pino log level (`debug`, `info`, `warn`, `error`); defaults to `info`

## Shared Validation

This package imports pre-registration schemas from `@app/validation`:

- `preRegistroSchema` — Zod schema for the full pre-registration object (validates CURP format, date, email, phone, etc.)
- `zodIssuesToErrorEnvelope()` — Converts Zod validation errors into the standard error response format

The validation layer ensures both frontend and backend agree on what constitutes valid input, and provides exact error messages to the client when validation fails.

## Security Notes

- **Input sanitization** — All free-text fields (names, addresses, medical notes) are sanitized via `sanitize-html` to strip HTML tags before persistence
- **SQL injection prevention** — Prisma parameterized queries (tagged templates) are used exclusively; no raw string interpolation
- **PII in logs** — The logger redacts: curp, rfc, nombre, apellidoPaterno, apellidoMaterno, email, telefono, domicilio, alergias, observaciones
- **Rate limiting** — The public pre-registros endpoint is throttled to 20 requests per 60 seconds per client IP
- **Duplicate CURP handling** — Enforced at the database level; duplicate attempts return 409 Conflict instead of silent overwrite
- **No authenticated update** — The public endpoint creates only; corrections must go through the authenticated reception console (Phase 4)
