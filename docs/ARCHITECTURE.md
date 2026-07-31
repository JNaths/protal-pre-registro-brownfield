<!-- generated-by: gsd-doc-writer -->

# Architecture

## System Overview

Portal de Pre-registro de Pacientes is a full-stack web application designed to eliminate paper-based patient registration. The system consists of a public, unauthenticated multi-step wizard (frontend) where patients pre-register before arriving at the clinic, and a planned authenticated reception console (backend) where staff validate the submitted registrations. The wizard captures personal, contact, address, and basic medical data; both client and server independently validate the data using the same shared Zod schema; and the server persists the record atomically (patient profile + address + medical info + consent timestamp) to PostgreSQL via Prisma, returning a confirmation ID. Future phases will add the reception console, staff login, and record update capabilities.

## Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                       React Frontend (@app/web)              │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  PreRegistroWizard (5 steps)                            │ │
│  │  ├─ Step 0: PersonalStep (nombre, apellidos, DOB, sexo)│ │
│  │  ├─ Step 1: ContactoStep (CURP, RFC, email, teléfono)  │ │
│  │  ├─ Step 2: DomicilioStep (calle, colonia, estado...)  │ │
│  │  ├─ Step 3: MedicaStep (tipo sangre, alergias, notas)  │ │
│  │  └─ Step 4: ConsentimientoStep (privacidad consent)    │ │
│  └─────────────────────────────────────────────────────────┘ │
│  │                                                            │
│  │  usePreRegistroForm (React Hook Form + Zod)              │
│  │    • stepSchemas (schema.pick per step)                 │
│  │    • Client-side validation on blur                     │
│  │    • POST /api/pre-registros on submit                  │
│  │    • Maps 422 field errors back to steps                │
│  │    • Handles 409 duplicate CURP                         │
└──────────────────────────┬───────────────────────────────────┘
                           │ JSON POST
                           ▼
┌──────────────────────────────────────────────────────────────┐
│          Express API Server (@app/api) — Port 3000           │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Rate Limiter (20 req/min per IP, in-memory)            │ │
│  │  JSON Parser (express.json)                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│  │                                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  POST /api/pre-registros Handler                        │ │
│  │  ├─ Zod validation (preRegistroSchema)                  │ │
│  │  ├─ HTML sanitization (sanitize-html)                  │ │
│  │  ├─ Re-validation after sanitization                   │ │
│  │  ├─ Prisma nested create (atomic)                      │ │
│  │  │  ├─ PreRegistro                                     │ │
│  │  │  ├─ Domicilio (1-to-1)                              │ │
│  │  │  ├─ InfoMedica (1-to-1)                             │ │
│  │  │  └─ Consentimiento (1-to-1, timestamp immutable)    │ │
│  │  └─ Returns 200|409|422|429|500|503                    │ │
│  │                                                          │ │
│  │  GET /api/health Handler                                │ │
│  │  └─ Checks Prisma + PostgreSQL connectivity            │ │
│  └─────────────────────────────────────────────────────────┘ │
│  │                                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Error Handler (terminal, catches parsing/route errors) │ │
│  │  └─ Returns 400 for malformed JSON, 500 for exceptions  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │ SQL (parameterized via Prisma)
                           ▼
        ┌──────────────────────────────────┐
        │  PostgreSQL Database (Prisma 7)  │
        │                                  │
        │  pre_registro (main)              │
        │  ├─ id, nombre, apellidos...      │
        │  ├─ curp (UNIQUE)                 │
        │  └─ rfc (UNIQUE, nullable)        │
        │                                  │
        │  consentimiento (1-to-1)          │
        │  ├─ fechaAceptacion (immutable)   │
        │  └─ versionAvisoPrivacidad        │
        │                                  │
        │  domicilio (1-to-1)               │
        │  └─ calle, numero, colonia...     │
        │                                  │
        │  info_medica (1-to-1)             │
        │  └─ tipoSangre, alergias, obs.    │
        │                                  │
        │  personal_de_recepcion (future)   │
        │  └─ staff login (Phase 4/5)       │
        └──────────────────────────────────┘
```

## Data Flow

### 1. Patient Pre-registration Submission

1. **Client Initialization**: Patient opens the public wizard URL (no login required).
2. **Multi-Step Entry**: Patient navigates 5 steps using `PreRegistroWizard`, entering data into React Hook Form.
3. **Client-Side Validation**: On each step transition, frontend validates using the step-scoped Zod schema (e.g., `personalStepSchema.safeParse(watchedValues)`). The "Siguiente" button remains disabled until validation passes.
4. **Submit**: Patient clicks submit on the final step (Consentimiento). Frontend calls `usePreRegistroForm.onSubmit()`.
5. **HTTP POST**: Frontend sends `POST /api/pre-registros` with the complete form data as JSON.

### 2. Server Reception & Validation

6. **Rate Limiting**: Incoming request is checked against the in-memory rate limiter (20 req/min per IP). If exceeded, returns 429 with `Retry-After` header.
7. **JSON Parsing**: Express parses the request body (or returns 400 if malformed).
8. **Schema Validation**: Server calls `preRegistroSchema.safeParse(req.body)`. If validation fails, maps Zod issues to `{error: {message, fields}}` and returns 422.
9. **Sanitization**: All free-text fields (nombre, apellidoPaterno, apellidoMaterno, domicilio.*, infoMedica.alergias, infoMedica.observaciones) are processed through `sanitizeField()`, which strips HTML tags and decodes entities.
10. **Re-Validation**: The sanitized data is validated a second time using `preRegistroSchema.safeParse(sanitized)` to ensure sanitization did not corrupt required fields. If re-validation fails, returns 422.

### 3. Atomic Persistence

11. **Prisma Nested Create**: Server calls `prisma.preRegistro.create()` with a nested write:
    - Creates PreRegistro record (nombre, apellidos, curp, rfc, email, telefono, fechaNacimiento, sexo).
    - Atomically creates Domicilio (calle, numero, colonia, codigoPostal, estado, municipio).
    - Atomically creates InfoMedica (tipoSangre, alergias, observaciones).
    - Atomically creates Consentimiento with `aceptado: true` and `fechaAceptacion: now()`.
    - All succeed or all rollback (no partial writes).
12. **Uniqueness Check**: If a CURP already exists, Prisma detects the unique constraint violation (P2002) and throws `DuplicateCurpError`, which the handler catches and returns 409.
13. **Logging**: On success, logs `{action: "create", id: preRegistro.id}`. On error, logs only non-PII metadata (error name, Prisma code if applicable).

### 4. Response & Client Handling

14. **Success (200)**: Server returns `{success: true, message: "Registro creado", id, createdAt}`. Frontend displays `SuccessScreen` with the confirmation ID.
15. **Validation Error (422)**: Server returns field errors keyed by path (e.g., `"domicilio.codigoPostal": "debe ser 5 dígitos"`). Frontend maps them to form errors via `mapServerErrorsToForm()`, navigates to the first offending step, and shows error banner.
16. **Duplicate CURP (409)**: Server returns a specific message directing patient to reception. Frontend shows this message in the error banner.
17. **Rate Limit (429)**: Server returns message to retry later. Frontend shows this in the error banner.
18. **Server Error (500)**: Server returns generic "Error interno" message without exposing details. PII-safe logging has already recorded the issue for debugging.

## Key Abstractions

### Shared Validation Layer (`@app/validation`)

- **`preRegistroSchema`** — Master Zod schema defining all required/optional fields, format validations (CURP, RFC, email, phone), and custom refinements (non-future date for DOB, consent must be true). Used by BOTH client and server.
- **`stepSchemas`** — Array of Zod schemas created via `schema.pick()`, one per wizard step. Used by frontend for step-level gating and server for field error mapping.
- **`zodIssuesToErrorEnvelope()`** — Utility converting Zod validation errors into the standard error response shape `{error: {message, fields}}`.

### Frontend Form Logic (`@app/web/src/hooks`)

- **`usePreRegistroForm()`** — React Hook Form integration combining Zod validation with API communication. Manages form state, step-level validation via `isStepValid()`, and API submission via `onSubmit()`. Returns `{form, isStepValid, onSubmit}`.

### Backend Data Handlers (`@app/api/src`)

- **`createPreRegistro(data: PreRegistroInput)`** — Isolated async function performing the Prisma nested create. Wraps unique constraint violations as `DuplicateCurpError` for clean error handling.
- **`sanitizeField(input: string)`** — Uses `sanitize-html` with an empty tag allowlist and carefully decodes HTML entities to preserve accented characters and special symbols in Mexican names/addresses. Safe against XSS because tags are stripped before decoding.

### Middleware (`@app/api/src/middleware`)

- **`createRateLimit(options)`** — Zero-dependency, in-memory fixed-window rate limiter. Tracks per-IP request counts and resets after the configured window. Prunes stale buckets when the map exceeds a threshold to prevent unbounded memory growth.

### Error Handling

- **Terminal Error Handler** (Express middleware registered last) — Catches exceptions from route handlers and parsing errors. Returns `{error: {message}}` in JSON with appropriate HTTP status (400 for parse errors, 500 for unhandled exceptions). Never leaks stack traces or internal details.

## Directory Structure Rationale

### Root Level

- **`prisma/`** — Prisma schema, migrations, and config. Centralized database definition shared across the monorepo.
- **`packages/`** — Monorepo workspaces (npm workspaces).
- **`docs/`** — Project documentation.
- **`.env.example`** — Template for `DATABASE_URL` and other env vars.

### `packages/web/` — React Frontend

```
src/
├── components/
│   ├── form/           # Wizard orchestration (PreRegistroWizard, ProgressIndicator, StepNavigation)
│   ├── steps/          # 5 step components (PersonalStep, ContactoStep, DomicilioStep, MedicaStep, ConsentimientoStep)
│   ├── ui/             # Reusable shadcn/ui components (Card, Button, Input, Select, etc.)
│   └── common/         # Layout components (ErrorBanner, SuccessScreen)
├── hooks/
│   └── usePreRegistroForm.ts  # Form state + API communication
├── lib/
│   ├── step-schemas.ts        # Frontend-only schema.pick() slices
│   └── form-utils.ts          # Helper: mapServerErrorsToForm(), getStepIndexByField()
├── types/              # TypeScript type definitions
├── App.tsx            # Root component wrapping PreRegistroWizard
└── main.tsx           # Vite entry point
```

**Rationale**: Separation of concerns — form orchestration (`form/`), step-specific UI (`steps/`), reusable component library (`ui/`), and business logic (`hooks/`). The `@app/validation` package is imported but not duplicated.

### `packages/api/` — Node.js/Express Backend

```
src/
├── routes/            # Express routers (pre-registros.ts, health.ts)
├── middleware/        # Middleware (rate-limit.ts)
├── utils/             # Utilities (sanitize.ts, logger.ts)
├── db/                # Prisma client singleton (client.ts)
├── env.ts             # Environment variable loading
└── index.ts           # Express app setup and server bind
```

**Rationale**: Routes are isolated for testability; middleware is reusable; utilities are pure functions; the `db/` directory ensures a single Prisma client instance. The `@app/validation` package is imported for schema re-validation.

### `packages/validation/` — Shared Zod Schemas

```
src/
├── pre-registro.ts    # Master preRegistroSchema
├── curp.ts            # CURP validation + external library import
├── rfc.ts             # RFC validation + external library import
├── contact.ts         # Email and phone regex schemas
├── estados.ts         # Mexican state enum
├── error-envelope.ts  # zodIssuesToErrorEnvelope utility
└── index.ts           # Barrel export
```

**Rationale**: All validation lives in one package, imported by `@app/web` (for client-side step validation) and `@app/api` (for server-side re-validation). This ensures the same rules apply on both sides — a field that passes client validation is very likely to pass server validation, reducing round trips.

## Request/Response Contracts

### POST /api/pre-registros

**Request Body** (JSON):
```json
{
  "nombre": "Juan",
  "apellidoPaterno": "García",
  "apellidoMaterno": "López",
  "fechaNacimiento": "1990-01-15",
  "sexo": "H",
  "curp": "GALJ900115HDFXYZ01",
  "rfc": "GALJ900115A12",
  "email": "juan@example.com",
  "telefono": "+5215551234567",
  "domicilio": {
    "calle": "Avenida Principal",
    "numero": "123",
    "colonia": "Centro",
    "codigoPostal": "06000",
    "estado": "Ciudad de México",
    "municipio": "Cuauhtémoc"
  },
  "infoMedica": {
    "tipoSangre": "O+",
    "alergias": "Penicilina",
    "observaciones": "Diabetes tipo 2"
  },
  "consentimiento": true
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Registro creado",
  "id": 42,
  "createdAt": "2025-07-31T10:30:45.123Z"
}
```

**Validation Error (422 Unprocessable Entity)**:
```json
{
  "error": {
    "message": "Validación fallida",
    "fields": {
      "curp": "CURP no válido",
      "domicilio.codigoPostal": "Código postal debe ser 5 dígitos"
    }
  }
}
```

**Duplicate CURP (409 Conflict)**:
```json
{
  "error": {
    "message": "Ya existe un pre-registro con este CURP. Acude a recepción para actualizar tus datos."
  }
}
```

**Rate Limit Exceeded (429 Too Many Requests)**:
```json
{
  "error": {
    "message": "Demasiadas solicitudes. Intenta de nuevo más tarde."
  }
}
```

Headers: `Retry-After: 45` (seconds remaining in the rate-limit window).

**Malformed JSON (400 Bad Request)**:
```json
{
  "error": {
    "message": "JSON malformado"
  }
}
```

**Internal Server Error (500 Internal Server Error)**:
```json
{
  "error": {
    "message": "Error interno del servidor"
  }
}
```

**Database Unavailable (503 Service Unavailable)** — from `/api/health`:
```json
{
  "status": "error",
  "timestamp": "2025-07-31T10:30:45.123Z"
}
```

### GET /api/health

**Success Response (200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2025-07-31T10:30:45.123Z",
  "database": "connected",
  "uptime": 3600.5
}
```

**Database Down (503 Service Unavailable)**:
```json
{
  "status": "error",
  "timestamp": "2025-07-31T10:30:45.123Z"
}
```

## Security Boundaries & Threat Mitigations

### 1. Input Validation (Double Validation)

**Threat**: Malformed or malicious input crashes the server or corrupts the database.
**Mitigation**:
- Client-side Zod validation provides immediate feedback.
- Server independently re-validates using `preRegistroSchema.safeParse()` — server NEVER trusts the client.
- Invalid input returns 422 with field-level error messages, never a generic 500.

### 2. HTML Injection / XSS (Sanitization)

**Threat**: User enters `<script>alert('xss')</script>` in a name field; it is stored and later displayed unsanitized, executing attacker code.
**Mitigation**:
- All free-text fields are sanitized via `sanitizeField()` using `sanitize-html` with an empty allowlist.
- Accented characters (ñ, á, etc.) are preserved via entity decoding because they are not re-rendered as HTML.
- Tags are stripped BEFORE entity decoding, so any `<` or `>` from user input becomes literal text, never parsed as HTML.

### 3. SQL Injection (Parameterized Queries)

**Threat**: User enters `'; DROP TABLE pre_registro; --` in an email field; the server executes it as SQL.
**Mitigation**:
- Prisma automatically parameterizes all queries — SQL templates are never constructed with string concatenation.
- The only raw SQL in the codebase is `prisma.$queryRaw\`SELECT 1 as healthy\`` (a tagged template), which is parameterized by construction.

### 4. Duplicate Record Attacks (CURP Uniqueness)

**Threat**: Unauthenticated user POSTs the same CURP twice, overwriting the first patient's data.
**Mitigation**:
- `curp` field has a `@unique` constraint in the Prisma schema.
- The endpoint is CREATE-only; it never UPDATEs an existing record.
- Duplicate CURP results in a Prisma P2002 unique violation, which the handler maps to 409 Conflict.
- Update-by-CURP is routed through the future authenticated reception console (Phase 4/5).

### 5. Excessive Requests / Resource Exhaustion (Rate Limiting)

**Threat**: Attacker floods the endpoint with 1000s of requests, exhausting database connections and CPU.
**Mitigation**:
- In-memory fixed-window rate limiter: 20 requests per 60 seconds per IP.
- Requests exceeding the limit receive 429 with `Retry-After` header.
- **Caveat**: In-memory limiter works only on a single process. For horizontally scaled deployments, replace with `express-rate-limit` backed by Redis/Memcached.

### 6. Information Disclosure (PII-Safe Logging)

**Threat**: Error stack traces are logged; they may contain user data (names, emails, medical info).
**Mitigation**:
- Error handler logs only non-PII metadata: error name and Prisma error code (if applicable).
- The actual error message or stack trace is NEVER logged.
- Database errors (e.g., connection timeouts) are logged as a Prisma code (e.g., "P1000") rather than the connection string or detailed reason.

### 7. Startup Misconfiguration (DATABASE_URL Validation)

**Threat**: `DATABASE_URL` environment variable is missing; Prisma client initialization fails silently or confusingly.
**Mitigation**:
- The API entry point (`src/index.ts`) explicitly checks for `DATABASE_URL` and throws an error with a helpful message if it is missing.
- The check happens before Express app setup, failing loudly and immediately.

## Monorepo Coordination

### Workspace Setup

- **Root `package.json`**: Defines workspaces via `"workspaces": ["packages/*"]` and provides root-level commands (`dev`, `build`, `test`, `db:*`).
- **Shared Dependencies**: `@prisma/client` is installed at the root and in the API package; `react` and `react-dom` are overridden at the root to ensure version consistency across all packages.

### Build & Test

- **`npm run build`**: Runs `npm run build --workspaces`, executing TypeScript compilation in each package sequentially.
- **`npm run test`**: Runs `npm test --workspaces`, executing vitest in each package.
- **`npm run dev`**: Runs `npm run dev --workspaces`, starting dev servers in all packages (Vite for web, tsx watch for API).

### Database Migrations & Client Generation

- **`npm run db:migrate`**: Runs Prisma migrate using the schema in `prisma/schema.prisma`.
- **`npm run db:generate`**: Runs `prisma generate`, creating the Prisma Client TypeScript types. Called automatically after migrations.

### Dependency Management

- **`@app/validation`** is a private package (no npm publish). It is consumed by `@app/web` (for client-side validation) and `@app/api` (for server-side validation) via workspace references.
- **`@app/api`** depends on `@app/validation` for Zod schemas.
- **`@app/web`** depends on `@app/validation` for Zod schemas and React Hook Form resolver.

## Deployment Architecture (Planned)

### Current Phase (Pre-registration Only)

- **Frontend**: Static SPA built by Vite, deployed to a CDN or static host (Vercel, Netlify).
- **Backend**: Node.js/Express API running on a server (EC2, Railway, Heroku, Fly.io).
- **Database**: PostgreSQL instance (RDS, managed service, or self-hosted).

### Future Phase (Reception Console & Auth)

- **Authentication**: JWT or session-based login for reception staff (Phase 4/5).
- **Additional Routes**: GET /api/pre-registros (search/list), PUT /api/pre-registros/:id (validate), DELETE /api/pre-registros/:id (cancel).
- **Authorization**: Role-based access control (admin, receptionist, doctor).

