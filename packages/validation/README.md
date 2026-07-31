<!-- generated-by: gsd-doc-writer -->

# @app/validation

Shared Zod schemas and Mexican legal ID validators. Provides the single source of truth for data validation across both the React patient pre-registration wizard (`@app/web`) and the Express API (`@app/api`), enabling frontend-backend double validation with zero duplication.

Part of the [Portal de Pre-registro de Pacientes](../README.md) monorepo.

## Purpose

This package centralizes all pre-registration form validation logic:

- **Pre-registration schema** (`preRegistroSchema`) — Full patient intake form with personal, contact, address, and medical information
- **Mexican ID validators** — CURP (unique taxpayer ID), RFC (business/tax ID), email, and phone with localized error messages
- **Enum & types** — 32 Mexican states, blood types, sex designations (H/M/X)
- **Error formatting** — Helper to convert Zod issues into a consistent error envelope for API responses

Both `@app/web` (form validation as user types) and `@app/api` (request validation at submission) import from this package. Changes to validation rules propagate instantly to both surfaces — no sync required.

## Installation

This is a private workspace package. Install dependencies from the monorepo root:

```bash
npm install
```

## Main Exports

### Schemas

- **`preRegistroSchema`** — Complete pre-registration object with nested address and medical info
  - Type: `PreRegistro`
  - Fields: nombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, sexo, curp, rfc (optional), email, telefono, domicilio (nested), infoMedica (nested), consentimiento
  
- **`curpSchema`** — CURP (18-character unique citizen ID)
  - Validates format, checksum, birth date, state code, forbidden words
  - **Includes local X-sex fallback**: The npm `validate-curp` library only accepts H/M. Schema auto-detects X-sex CURPs and validates them against the same algorithm the library uses, ensuring gender-inclusive support without abandoning the library for the 99% of real CURPs that are H/M
  - Type: `CURP`

- **`rfcSchema`** — RFC (business/tax ID, optional)
  - Validates format, homoclave, and check digit (strict mode)
  - Type: `RFC`

- **`emailSchema`** — Email address (trimmed, lowercase)
  - Type: `Email`

- **`phoneSchema`** — Mexican 10-digit phone
  - Auto-strips country code prefix `+52` if present
  - Strips all non-digits and normalizes to 10 digits
  - Type: `Phone`

- **`estadoSchema`** — Mexican state enum (all 32 states)
  - Type: `Estado`
  - Constant: `MEXICAN_STATES` (array of state names)

### Error Handling

- **`zodIssuesToErrorEnvelope(issues, defaultMessage?)`** — Converts Zod validation issues into API response format
  - Input: Array of `z.ZodIssue[]` (from `.parse()` errors)
  - Output: `ValidationErrorEnvelope` with `{ error: { message, fields } }`
  - Type: `ValidationErrorEnvelope`

## Usage Example

### In @app/web (React)

```typescript
import { preRegistroSchema } from "@app/validation";

const usePreRegistroForm = () => {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (step: FormStep, values: Record<string, any>) => {
    try {
      // Validate one step at a time
      preRegistroSchema.pick({ [step]: true }).parse(values);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors = err.flatten().fieldErrors;
        setErrors(Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? "Error"])
        ));
      }
      return false;
    }
  };
};
```

### In @app/api (Express)

```typescript
import { preRegistroSchema, zodIssuesToErrorEnvelope } from "@app/validation";

router.post("/pre-registros", (req, res) => {
  try {
    const validated = preRegistroSchema.parse(req.body);
    // Insert into database...
    res.json({ id, createdAt });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const envelope = zodIssuesToErrorEnvelope(err.issues, "Datos inválidos");
      return res.status(400).json(envelope);
    }
    res.status(500).json({ error: { message: "Error interno" } });
  }
});
```

## Directory Layout

```
src/
├── index.ts                 # Re-exports all schemas and types
├── pre-registro.ts          # Main preRegistroSchema combining all validators
├── curp.ts                  # CURP validator with X-sex fallback logic
├── rfc.ts                   # RFC validator
├── contact.ts               # Email and phone validators
├── estados.ts               # 32 Mexican states enum
├── error-envelope.ts        # zodIssuesToErrorEnvelope helper
└── types/
    ├── validate-curp.d.ts   # Type stubs for npm validate-curp
    └── validate-rfc.d.ts    # Type stubs for npm validate-rfc
```

## Build & Test

```bash
# Run unit tests (Vitest)
npm run test

# Type check and compile TypeScript
npm run build
```

## Notes

- **Localized messages** — All error messages are in Spanish (es-MX) for patient-facing UIs
- **X-sex CURP support** — See `src/curp.ts` module doc comment for details on the X-sex fallback
- **Optional RFC** — RFC is optional; only validated if provided
- **Date validation** — Birth date must be in the past; phone and email are required
