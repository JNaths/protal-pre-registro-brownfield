<!-- generated-by: gsd-doc-writer -->

# DEVELOPMENT.md

## Local Setup

### Prerequisites

Before you start developing, ensure you have:

- **Node.js** >= 18.0.0 (npm >= 11.0.0 is included)
- **PostgreSQL** (locally via Docker Compose, or accessible remotely with connection URL)
- **Git** for version control

### Clone and Install

```bash
git clone <repository-url>
cd portal-preregistro
npm install
```

### Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your local database connection:

```env
DATABASE_URL=postgresql://portal:portal@localhost:5432/portal_preregistro?schema=public
DIRECT_URL=postgresql://portal:portal@localhost:5432/portal_preregistro?schema=public
PORT=3000
```

### Start PostgreSQL (Docker)

If using Docker Compose:

```bash
npm run docker:up
```

### Set Up Database

Generate the Prisma client:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

### Start Development Servers

Run all services at once:

```bash
npm run dev
```

This starts:
- **API**: `http://localhost:3000`
- **Web**: `http://localhost:5173`

To run a single service:

```bash
npm run dev --workspace=@app/api
npm run dev --workspace=@app/web
```

## Monorepo Structure

This is an npm workspaces monorepo with three packages:

| Package | Purpose | Tech |
|---------|---------|------|
| `packages/api` | REST API backend, database operations | Express, Prisma, Node.js |
| `packages/web` | Patient pre-registration and reception console | React, TypeScript, Vite, Tailwind |
| `packages/validation` | Shared Zod schemas and validators | Zod, TypeScript |

### TypeScript Project References

The build system uses composite TypeScript projects with file references:

- **Root `tsconfig.json`** (`compilerOptions.composite: false`): Sets base settings and path mappings for `@app/validation`
- **`packages/api/tsconfig.json`** (`composite: true`, `references: [{ path: "../validation" }]`): API package that depends on validation
- **`packages/web/tsconfig.json`** (`composite: true`, `references: [{ path: "../validation" }]`): Web package that depends on validation
- **`packages/validation/tsconfig.json`** (`composite: true`): Validation package (no references)

**Key implication**: When validation schemas change, run `npm run build` to rebuild dependents. Changes do NOT hot-reload in dev mode — you must rebuild.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build all workspaces in dependency order (`tsc -b`) |
| `npm run build --workspace=@app/api` | Build only API (TypeScript + incremental) |
| `npm run build --workspace=@app/web` | Build only Web (TypeScript, then Vite) |
| `npm run build --workspace=@app/validation` | Build only validation (TypeScript) |
| `npm run dev` | Start all dev servers |
| `npm run test` | Run all tests (Vitest) |
| `npm run test --workspace=@app/api` | Run API tests |

## Code Style and Conventions

### TypeScript Settings

All packages use:
- **Target**: `ES2020`
- **Module**: `ESNext`
- **Strict mode**: `true` (strict null checks, strict function types, etc.)
- **Module resolution**: `node`

### Validation: Zod Schemas

Validation schemas live in `packages/validation/src/` and are consumed by both API and Web:

**Location**: `packages/validation/src/`

Example: `pre-registro.ts` defines the main form schema using Zod:

```typescript
import { z } from "zod";

export const preRegistroSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(100),
  curp: curpSchema,
  email: emailSchema,
  // ... more fields
  consentimiento: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar el aviso de privacidad",
  }),
});

export type PreRegistro = z.infer<typeof preRegistroSchema>;
```

### How Schemas Propagate

1. **Add a new schema** to `packages/validation/src/` (e.g., `new-field.ts`)
2. **Export** from `packages/validation/src/index.ts`
3. **In API**: Import and use `safeParse()`

   ```typescript
   import { newFieldSchema } from "@app/validation";

   const parsed = newFieldSchema.safeParse(req.body);
   if (!parsed.success) {
     res.status(422).json(zodIssuesToErrorEnvelope(parsed.error.issues));
     return;
   }
   ```

4. **In Web**: Import and use with React Hook Form

   ```typescript
   import { newFieldSchema } from "@app/validation";
   import { zodResolver } from "@hookform/resolvers/zod";

   const form = useForm({
     resolver: zodResolver(newFieldSchema),
   });
   ```

### Adding a New Wizard Step

The pre-registration form is a 5-step wizard. To add a step:

1. **Add fields to the validation schema** (`packages/validation/src/pre-registro.ts`)

   ```typescript
   export const preRegistroSchema = z.object({
     // ... existing fields
     newStep: z.object({
       newField: z.string().min(1),
     }),
   });
   ```

2. **Create a step schema slice** (`packages/web/src/lib/step-schemas.ts`)

   ```typescript
   export const newStepSchema = preRegistroSchema.pick({
     newStep: true,
   });

   export const stepSchemas = [
     // ... existing steps
     newStepSchema,
   ] as const;
   ```

3. **Create a React component** (`packages/web/src/components/steps/NewStep.tsx`)

   ```typescript
   import { useFormContext } from "react-hook-form";
   import type { PreRegistro } from "@app/validation";

   export function NewStep() {
     const { register, formState: { errors } } = useFormContext<PreRegistro>();

     return (
       <div>
         <h2 data-step-heading="5">New Step Title</h2>
         <Input {...register("newStep.newField")} />
         {errors.newStep?.newField && <p>{errors.newStep.newField.message}</p>}
       </div>
     );
   }
   ```

4. **Add to the wizard** (`packages/web/src/components/form/PreRegistroWizard.tsx`)

   ```typescript
   import { NewStep } from "@/components/steps/NewStep";

   // In the render:
   {currentStep === 5 && <NewStep />}
   ```

5. **Update step titles** (`packages/web/src/lib/step-schemas.ts`)

   ```typescript
   export const STEP_TITLES = [
     // ...
     "New Step Title",
   ] as const;
   ```

### Form Validation: Client + Server

**Client side** (Web, `packages/web/src/hooks/usePreRegistroForm.ts`):
- `useForm()` with `zodResolver` validates on blur (`mode: "onTouched"`)
- Step-by-step validation with `form.trigger()` before advancing
- Typed error mapping for nested fields

**Server side** (API, `packages/api/src/routes/pre-registros.ts`):
- `preRegistroSchema.safeParse()` validates all inputs
- Errors returned as 422 with field-level messages
- Second validation pass after sanitization (defense-in-depth)

### React 18 and forwardRef

**Critical**: React 18 requires `React.forwardRef()` for any custom component that accepts a `ref` prop. Without it, React Hook Form's `register()` cannot attach the ref to the DOM element.

Example (`packages/web/src/components/ui/input.tsx`):

```typescript
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return <input ref={ref} className={cn(...)} {...props} />;
  }
);
Input.displayName = "Input";
export { Input };
```

**Gotcha**: If you wrap a native input in a custom component and forget `forwardRef`, RHF cannot read the field value on blur. You'll see cryptic "expected string, received undefined" errors instead of the field's own validation message.

### React Hook Form + Nested Fields

RHF's error tree for nested objects (e.g., `domicilio.calle`) requires special handling for focus management:

```typescript
function findFirstErrorPath(node: unknown, prefix: string): string | undefined {
  if (isLeafFieldError(node)) return prefix;
  for (const key of Object.keys(node as Record<string, unknown>)) {
    const found = findFirstErrorPath(
      (node as Record<string, unknown>)[key],
      `${prefix}.${key}`
    );
    if (found) return found;
  }
  return undefined;
}
```

This walks the error tree to find the first focusable input and move focus there on validation failure.

### Prisma 7 Configuration

Prisma 7 moved database connection config out of `schema.prisma` and into a separate `prisma.config.ts` file at the project root:

```typescript
// prisma.config.ts
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,           // Pooled (for runtime)
    directUrl: process.env.DIRECT_URL,       // Direct (for migrations)
  },
});
```

**Why two URLs?**: Neon (and other serverless databases) require a direct connection for migrations but recommend a pooler (PgBouncer) for runtime. This config accommodates both.

### Sanitization

The API sanitizes free-text fields (names, addresses, medical notes) before persistence:

```typescript
import { sanitizeField } from "../utils/sanitize";

const sanitized = {
  ...parsed.data,
  nombre: sanitizeField(parsed.data.nombre),
  // ... more fields
};
```

This removes potentially harmful HTML/scripts. Sanitization is a second line of defense after client-side validation.

### Logging

Use Pino for structured logging (API only):

```typescript
import { logger } from "../utils/logger";

const log = logger.child({ route: "/api/pre-registros" });
log.info({ action: "create", id: preRegistro.id });
log.error({ action: "create", failed: true, name: error?.name });
```

**Important**: Never log PII (personal data). Log only action, IDs, and error names/codes — never the error message itself, which may contain user data.

## Branch Conventions

No branch-naming convention is currently documented. Follow these recommendations:

- Use `feature/`, `fix/`, `docs/` prefixes
- Use kebab-case: `feature/add-step-validation`
- Reference GitHub issues if applicable: `feature/add-step-validation-#123`

## PR Process

1. **Create a feature branch** from `main`
2. **Make changes** and ensure tests pass (`npm test`)
3. **Build locally** to catch TypeScript errors (`npm run build`)
4. **Commit with clear messages** (describe the what and why)
5. **Push to GitHub** and open a pull request
6. **Await code review** — at least one approval before merge
7. **Squash or rebase** if requested, then merge

**PR checklist**:
- Tests pass (`npm test`)
- No TypeScript errors (`npm run build`)
- For schema changes: validation rule documented, both client and server updated
- For UI changes: WCAG AA accessibility verified (focus management, aria labels)
- Commit messages are clear and concise

## Common Development Tasks

### Running Tests

```bash
# All tests
npm test

# Specific package
npm test --workspace=@app/api
npm test --workspace=@app/web
npm test --workspace=@app/validation

# Watch mode (API)
npm test --workspace=@app/api -- --watch
```

### Building for Production

```bash
npm run build
```

This builds all packages in dependency order. TypeScript errors will cause the build to fail — fix them before proceeding.

### Checking for TypeScript Errors

The build process checks types, but you can also run:

```bash
npm run build
```

### Updating Prisma Schema

1. Edit `prisma/schema.prisma`
2. Generate the client: `npm run db:generate`
3. Create a migration: `npm run db:migrate`
4. Run migrations: migrations apply automatically on `dev`

## Known Gotchas

### Composite TypeScript Builds Don't Hot-Reload

If you modify a schema in `packages/validation`, the change won't automatically propagate to `packages/api` or `packages/web` in dev mode. You must rebuild:

```bash
npm run build --workspace=@app/validation
```

Then restart the dev servers that consume validation.

### React 18 Requires forwardRef

Custom form components must use `React.forwardRef()` to work with React Hook Form's `register()` method. See the "React 18 and forwardRef" section above.

### Nested Field Error Focus

RHF's `setFocus()` doesn't work on nested error objects directly (e.g., `formState.errors.domicilio` is an object, not a focusable field). You must walk the error tree to find the first leaf error and focus that field. See the `usePreRegistroForm` hook for the pattern.

### Prisma Migrations Require directUrl

If your database uses a connection pooler (e.g., Neon), migrations must use a direct connection. Set `DIRECT_URL` in `.env.local` to a non-pooled connection URL. If you skip this, migrations will hang.

### Defense-in-Depth Sanitization

The API validates twice: once on the raw request body, then again after sanitization. This catches cases where sanitization emptied a required field. Always re-validate after sanitizing.

### Never Log PII

Logger output may be ingested by external systems or viewed by team members. Never log request bodies, user emails, phone numbers, or other personally identifiable information. Log only action names, IDs, and error names/codes.

## Next Steps

- See **TESTING.md** to understand the testing strategy and how to write tests
- See **ARCHITECTURE.md** for a high-level system overview and component diagram
- See **CONFIGURATION.md** for environment variables and config file formats
