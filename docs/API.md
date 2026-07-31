<!-- generated-by: gsd-doc-writer -->

# API.md

## Authentication

The API currently has **no authentication requirements**. Both endpoints are publicly accessible:

- **GET /api/health** — Health check (public, no credentials required)
- **POST /api/pre-registros** — Patient pre-registration submission (public, no credentials required)

The reception console (Phase 2) will introduce authentication for data retrieval and validation endpoints. At that time, authentication details and JWT bearer token requirements will be documented here.

## Endpoints Overview

| Method | Path | Description | Auth Required |
|--------|------|-------------|---|
| GET | /api/health | Stack health check (Express, Prisma, PostgreSQL) | No |
| POST | /api/pre-registros | Create a new patient pre-registration | No |

## GET /api/health

**Purpose:** Verifies that Express, Prisma ORM, and PostgreSQL database are all connected and operational. Used for deployment health monitoring and diagnostic troubleshooting.

**Request:** No request body required.

```bash
curl -X GET http://localhost:3000/api/health
```

**Response — 200 OK**

```json
{
  "status": "ok",
  "timestamp": "2026-07-31T14:32:15.123Z",
  "database": "connected",
  "uptime": 125.456
}
```

**Response — 503 Service Unavailable** (database unreachable)

```json
{
  "status": "error",
  "timestamp": "2026-07-31T14:32:15.123Z"
}
```

## POST /api/pre-registros

**Purpose:** Creates a new patient pre-registration record. The patient submits their personal, contact, address, and basic medical information along with explicit privacy consent before their first visit. The endpoint validates all inputs, sanitizes free-text fields, and persists a complete pre-registration record with related domicilio (address) and infoMedica (medical info) nested records.

**Authentication:** None required (public endpoint).

**Rate Limit:** 20 requests per 60 seconds per IP address. Exceeding this limit returns a 429 response with a `Retry-After` header.

### Request Body

All fields are required unless marked optional.

```json
{
  "nombre": "Juan",
  "apellidoPaterno": "García",
  "apellidoMaterno": "López",
  "fechaNacimiento": "1993-04-11",
  "sexo": "H",
  "curp": "GAGL930411HCDRRN09",
  "rfc": "GAGL930411HCD",
  "email": "juan.garcia@example.com",
  "telefono": "5551234567",
  "domicilio": {
    "calle": "Avenida Reforma",
    "numero": "505",
    "colonia": "Juárez",
    "codigoPostal": "06500",
    "estado": "Ciudad de México",
    "municipio": "Cuauhtémoc"
  },
  "infoMedica": {
    "tipoSangre": "O+",
    "alergias": "Penicilina, mariscos",
    "observaciones": "Operado de apéndice en 2015"
  },
  "consentimiento": true
}
```

#### Field Specifications

**Personal Information**

- **nombre** — First name
  - Type: `string`
  - Length: 1–100 characters
  - Required
  - Example: `"Juan"`

- **apellidoPaterno** — Father's last name
  - Type: `string`
  - Length: 1–100 characters
  - Required
  - Example: `"García"`

- **apellidoMaterno** — Mother's last name
  - Type: `string`
  - Length: 1–100 characters
  - Required
  - Example: `"López"`

- **fechaNacimiento** — Date of birth
  - Type: `string` (ISO 8601 date format: YYYY-MM-DD)
  - Required
  - Must be a valid calendar date and cannot be in the future
  - Example: `"1993-04-11"`

- **sexo** — Biological sex
  - Type: `enum` — must be one of: `"H"` (Hombre/Male), `"M"` (Mujer/Female), `"X"` (No especificado/Other)
  - Required
  - Example: `"H"`

- **curp** — CURP (Clave Única de Registro de Población)
  - Type: `string`
  - Length: Exactly 18 characters
  - Format: Uppercase alphanumeric (auto-converted to uppercase)
  - Validation: Checksum, valid birth date, valid state code, and forbidden-word check performed
  - Required
  - **Unique constraint:** CURP must be unique across all pre-registrations. Duplicate CURP returns 409 Conflict.
  - Example: `"GAGL930411HCDRRN09"`

**Contact Information**

- **email** — Email address
  - Type: `string`
  - Format: Valid email address (auto-trimmed and converted to lowercase)
  - Required
  - Example: `"juan.garcia@example.com"`

- **telefono** — Phone number
  - Type: `string`
  - Format: 10-digit Mexican phone number
  - Accepts input with or without "52" country code prefix (e.g., `"5551234567"` or `"525551234567"`)
  - Stored and validated as 10 digits
  - Required
  - Example: `"5551234567"`

- **rfc** — RFC (Registro Federal de Contribuyentes / Tax ID)
  - Type: `string`
  - Length: Variable (typically 13 characters for individuals)
  - Format: Valid RFC with correct check digit
  - Optional
  - Example: `"GAGL930411HCD"`

**Address (domicilio)**

Nested object; all address fields are required when the object is present.

- **calle** — Street name
  - Type: `string`
  - Length: 1–100 characters
  - Required
  - Example: `"Avenida Reforma"`

- **numero** — Street number / House number
  - Type: `string`
  - Length: 1–100 characters
  - Required
  - Example: `"505"`

- **colonia** — Neighborhood / District
  - Type: `string`
  - Length: 1–100 characters
  - Required
  - Example: `"Juárez"`

- **codigoPostal** — Postal code
  - Type: `string`
  - Format: Exactly 5 digits (`\d{5}`)
  - Required
  - Example: `"06500"`

- **estado** — State / Federal entity
  - Type: `string` (enum of the 32 valid Mexican states — **full names**, not abbreviations)
  - Valid values: `Aguascalientes`, `Baja California`, `Baja California Sur`, `Campeche`, `Chiapas`, `Chihuahua`, `Ciudad de México`, `Coahuila`, `Colima`, `Durango`, `Estado de México`, `Guanajuato`, `Guerrero`, `Hidalgo`, `Jalisco`, `Michoacán`, `Morelos`, `Nayarit`, `Nuevo León`, `Oaxaca`, `Puebla`, `Querétaro`, `Quintana Roo`, `San Luis Potosí`, `Sinaloa`, `Sonora`, `Tabasco`, `Tamaulipas`, `Tlaxcala`, `Veracruz`, `Yucatán`, `Zacatecas` (source: `packages/validation/src/estados.ts`)
  - Required
  - Example: `"Ciudad de México"`

- **municipio** — Municipality
  - Type: `string`
  - Length: 1–100 characters
  - Required
  - Example: `"Cuauhtémoc"`

**Medical Information (infoMedica)**

Nested object; all fields within are optional.

- **tipoSangre** — Blood type
  - Type: `enum` — one of: `"O+"`, `"O-"`, `"A+"`, `"A-"`, `"B+"`, `"B-"`, `"AB+"`, `"AB-"`
  - Optional
  - Example: `"O+"`

- **alergias** — Known allergies
  - Type: `string`
  - Length: Maximum 1000 characters
  - Optional
  - Example: `"Penicilina, mariscos"`

- **observaciones** — Additional medical observations
  - Type: `string`
  - Length: Maximum 1000 characters
  - Optional
  - Example: `"Operado de apéndice en 2015"`

**Consent**

- **consentimiento** — Privacy notice acceptance
  - Type: `boolean`
  - Must be `true` to create a pre-registration
  - Required
  - When accepted, the server records the timestamp and privacy notice version in the database
  - Example: `true`

### Response — 200 Created

Successful pre-registration creation. The patient record, address, medical info, and consent record have all been persisted atomically.

```json
{
  "success": true,
  "message": "Registro creado",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-07-31T14:32:15.123Z"
}
```

- **success** — `true` indicates successful creation
- **message** — Human-readable confirmation message (Spanish)
- **id** — UUID of the created PreRegistro record; use this to reference the patient in the reception console
- **createdAt** — ISO 8601 timestamp when the record was created in the database

### Response — 409 Conflict

A pre-registration with the same CURP already exists. This is not a server error — it is expected when a patient attempts to register twice or a reception staffer searches for an existing record.

```json
{
  "error": {
    "message": "Ya existe un pre-registro con este CURP. Acude a recepción para actualizar tus datos."
  }
}
```

The reception console will provide a mechanism to look up and update existing records by CURP. At the patient-facing pre-registration form, this response should trigger a message directing the user to visit reception.

### Response — 422 Unprocessable Entity

One or more required fields are missing, invalid, or malformed. The response includes a `fields` object mapping each problematic field path (dot-notation for nested fields) to its specific error message.

**Example: Missing required fields and invalid CURP format**

```json
{
  "error": {
    "message": "Validación fallida",
    "fields": {
      "nombre": "Nombre requerido",
      "curp": "Formato de CURP inválido",
      "domicilio.calle": "Calle requerida",
      "domicilio.codigoPostal": "Código postal debe ser 5 dígitos",
      "consentimiento": "Debe aceptar el aviso de privacidad"
    }
  }
}
```

**Example: Invalid email and phone**

```json
{
  "error": {
    "message": "Validación fallida",
    "fields": {
      "email": "Correo inválido",
      "telefono": "Teléfono debe tener 10 dígitos"
    }
  }
}
```

**Example: Duplicate CURP detected at validation stage (alternative path)**

If the CURP passes format validation but is later discovered to be a duplicate during database insertion, the response is 409, not 422.

**Field Path Mapping to Form Steps**

The error envelope uses dot-notation paths (e.g., `"domicilio.codigoPostal"`) to map validation errors back to the multi-step registration wizard:

- `nombre`, `apellidoPaterno`, `apellidoMaterno`, `fechaNacimiento`, `sexo` → Step 1 (Personal Information)
- `curp`, `rfc` → Step 2 (Tax/Government IDs)
- `email`, `telefono` → Step 3 (Contact)
- `domicilio.*` (calle, numero, colonia, codigoPostal, estado, municipio) → Step 4 (Address)
- `infoMedica.*` (tipoSangre, alergias, observaciones) → Step 5 (Medical Info)
- `consentimiento` → Step 6 (Consent)

### Response — 429 Too Many Requests

The client has exceeded the rate limit (20 requests per 60-second window per IP address). The `Retry-After` header indicates how many seconds to wait before retrying.

```json
{
  "error": {
    "message": "Demasiadas solicitudes. Intenta de nuevo más tarde."
  }
```

**Headers**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 45
```

The `Retry-After` value is the number of seconds remaining in the current rate-limit window.

### Response — 500 Internal Server Error

An unexpected server error occurred (e.g., database connection failure, unhandled exception). The response does not include error details or stack traces to prevent information disclosure.

```json
{
  "error": {
    "message": "Error interno del servidor"
  }
}
```

### Response — 400 Bad Request

The request body is not valid JSON. This error is generated by Express's `express.json()` middleware before route handling and is caught by the global error handler.

```json
{
  "error": {
    "message": "JSON malformado"
  }
}
```

## Error Handling

All error responses follow a consistent envelope structure:

```json
{
  "error": {
    "message": "Human-readable error message in Spanish"
  }
}
```

Validation errors (422) add a `fields` object:

```json
{
  "error": {
    "message": "Validación fallida",
    "fields": {
      "field.name": "Error message for this field",
      "nested.field.name": "Error message for nested field"
    }
  }
}
```

**Security Notes:**

- Error messages never include stack traces, internal exception details, or database connection strings
- Validation error messages are safe to display to the client — they describe format/constraint violations, not sensitive system details
- Non-PII diagnostic information is logged server-side for operators to troubleshoot failures

## Rate Limiting

**Endpoint:** POST /api/pre-registros only

**Mechanism:** In-memory fixed-window rate limiter, per-IP address

**Configuration:**
- Window: 60 seconds (60,000 milliseconds)
- Limit: 20 requests per window per unique IP address

**Behavior:**
- Once a client reaches 20 requests in a 60-second window, all subsequent requests from that IP are rejected with HTTP 429
- The `Retry-After` response header indicates the number of seconds until the window resets
- The rate limiter is stored in process memory; in a horizontally-scaled deployment (multiple API instances behind a load balancer), each instance maintains its own independent rate-limit counters

**For Production:** The in-memory rate limiter is suitable for single-instance deployments. For multi-instance production deployments, replace with `express-rate-limit` backed by Redis or Memcached, and enable `app.set("trust proxy", ...)` to correctly identify client IPs behind reverse proxies.

## Request Validation & Data Sanitization

The endpoint enforces a two-pass validation strategy:

1. **Schema validation** — Incoming request body is validated against the Zod schema (format, type, length, enum constraints). Failed validation returns 422 with detailed field errors.

2. **Sanitization** — Free-text fields (nombre, apellidoPaterno, apellidoMaterno, calle, numero, colonia, municipio, alergias, observaciones) are HTML-sanitized to strip tags and script content (defense against XSS).

3. **Re-validation** — The sanitized payload is re-validated against the schema to catch cases where sanitization emptied a required field.

Format-validated fields (CURP, RFC, email, phone, postal code, date) do not undergo sanitization — they are constrained to specific formats that preclude dangerous characters.

## Request Examples

### Minimal Valid Request

Only required fields:

```bash
curl -X POST http://localhost:3000/api/pre-registros \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellidoPaterno": "García",
    "apellidoMaterno": "López",
    "fechaNacimiento": "1993-04-11",
    "sexo": "H",
    "curp": "GAGL930411HCDRRN09",
    "email": "juan.garcia@example.com",
    "telefono": "5551234567",
    "domicilio": {
      "calle": "Avenida Reforma",
      "numero": "505",
      "colonia": "Juárez",
      "codigoPostal": "06500",
      "estado": "Ciudad de México",
      "municipio": "Cuauhtémoc"
    },
    "consentimiento": true
  }'
```

### Complete Request with Optional Fields

```bash
curl -X POST http://localhost:3000/api/pre-registros \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "María",
    "apellidoPaterno": "González",
    "apellidoMaterno": "Martínez",
    "fechaNacimiento": "1985-07-22",
    "sexo": "M",
    "curp": "GOMM850722HDFRZN01",
    "rfc": "GOMM850722HDF",
    "email": "maria.gonzalez@example.com",
    "telefono": "525559876543",
    "domicilio": {
      "calle": "Calle Principal",
      "numero": "102",
      "colonia": "Roma",
      "codigoPostal": "06700",
      "estado": "Estado de México",
      "municipio": "Toluca"
    },
    "infoMedica": {
      "tipoSangre": "A-",
      "alergias": "Latex",
      "observaciones": "Hipertensión controlada con medicamento"
    },
    "consentimiento": true
  }'
```

### Phone Number with Country Code

The phone field accepts phone numbers with or without the "52" country code prefix:

```bash
# These are equivalent:
"telefono": "5551234567"      # 10 digits
"telefono": "525551234567"    # 12 digits with "52" prefix
```

Both are normalized to 10 digits and stored as `"5551234567"`.

### CURP with Non-Binary Sex (X)

```bash
curl -X POST http://localhost:3000/api/pre-registros \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Alex",
    "apellidoPaterno": "Pérez",
    "apellidoMaterno": "Rodríguez",
    "fechaNacimiento": "1990-05-15",
    "sexo": "X",
    "curp": "PERR900515XJCRRN07",
    "email": "alex.perez@example.com",
    "telefono": "5559876543",
    "domicilio": {
      "calle": "Paseo de los Tamarindos",
      "numero": "400",
      "colonia": "Bosques",
      "codigoPostal": "05120",
      "estado": "Ciudad de México",
      "municipio": "Miguel Hidalgo"
    },
    "consentimiento": true
  }'
```

## Implementation Notes

- All timestamps in request/response are in ISO 8601 UTC format (e.g., `"2026-07-31T14:32:15.123Z"`)
- UUIDs are used for all entity IDs (`id` field in the response)
- The pre-registration record and all nested records (domicilio, infoMedica, consentimiento) are created atomically — either all succeed or all fail
- A unique constraint on `curp` (case-insensitive) prevents duplicate records at the database level
- The endpoint is stateless and idempotent in the sense that submitting the same data multiple times from the same IP within the rate-limit window returns either 200 (first success) or 409 (duplicate CURP on retry), never a silent skip
