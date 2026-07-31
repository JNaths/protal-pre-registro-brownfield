<!-- generated-by: gsd-doc-writer -->

# @app/web

Public multi-step patient pre-registration wizard for mobile-first form capture before clinic arrival, plus authenticated reception console for pre-registration validation.

Part of the [Portal de Pre-registro de Pacientes](../README.md) monorepo.

## Tech Stack

- **React 18** + **TypeScript** — type-safe component development
- **Vite** — lightning-fast dev server and build with HMR
- **Tailwind CSS v4** + **@tailwindcss/vite** — utility-first styling with Vite integration
- **shadcn/ui** (Radix-based components) — accessible, composable UI primitives
- **React Hook Form** + **@hookform/resolvers** — performant form state management
- **Zod** (via `@app/validation`) — runtime schema validation for form data
- **Vitest** — fast unit testing framework

## Installation

Since `@app/web` is a private workspace package, it is consumed via npm workspaces:

```bash
# From the monorepo root:
npm install

# Then, develop or build:
npm run dev       # Start Vite dev server (port 5173)
npm run build     # Build for production
npm run test      # Run tests
```

## Wizard Structure

The pre-registration flow is a 5-step guided wizard with client-side validation and server error handling:

### Steps

1. **Personal** — Name, surname, date of birth, sex, CURP, RFC
2. **Contacto** — Email and phone number
3. **Domicilio** — Street, number, neighborhood, postal code, state, municipality
4. **Médica** — Blood type, allergies, medical observations
5. **Consentimiento** — Explicit opt-in to data processing (LFPDPPP compliance)

### Form Flow

- **Progress Indicator** — Visual step counter (e.g., "1 of 5") with step labels
- **Step-Level Validation** — Each step validated against its Zod schema slice before allowing "Siguiente"
- **Reactive "Siguiente" Button** — Disabled while step schema validation fails; enabled as user corrects errors
- **Focus Management** — WCAG AA 2.4.3 compliance: focus moves to the new step's heading on navigation
- **Error Highlighting** — Field-level error messages from schema validation displayed inline

### Server Integration

On final submission (POST `/api/pre-registros`):

- **Success** (200 OK) — Displays success screen with registration ID and timestamp; form resets
- **Validation Error** (422) — Server error details mapped back to the step containing invalid fields, with user redirected to that step and error messages displayed
- **Duplicate CURP** (409) — User directed to reception for record correction
- **Connection Error** — User-friendly message with retry guidance

## API Integration

The wizard POSTs validated form data to `POST /api/pre-registros` (relative URL proxied by Vite dev server to `http://localhost:3000`).

**Request body shape** (from `@app/validation` preRegistroSchema):

```typescript
{
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  sexo: "M" | "F";
  curp: string;
  rfc: string;
  email: string;
  telefono: string;
  domicilio: {
    calle: string;
    numero: string;
    colonia: string;
    codigoPostal: string;
    estado: string;
    municipio: string;
  };
  infoMedica: {
    tipoSangre: string;
    alergias: string;
    observaciones: string;
  };
  consentimiento: boolean;
}
```

**Success response** (200 OK):

```json
{
  "id": 123,
  "createdAt": "2025-07-31T14:22:00Z"
}
```

**Validation error response** (422):

```json
{
  "error": {
    "message": "Validation failed",
    "fields": {
      "email": "Invalid email format",
      "domicilio.estado": "Estado is required"
    }
  }
}
```

## Directory Structure

```
src/
├── main.tsx                      # React root render
├── App.tsx                       # Main app component (mounts PreRegistroWizard)
├── index.css                     # Tailwind directives + global styles
├── components/
│   ├── form/                     # Wizard core
│   │   ├── PreRegistroWizard.tsx # Main wizard orchestrator
│   │   ├── WizardContext.tsx     # Step state management (currentStep, nextStep, prevStep, goToStep)
│   │   ├── ProgressIndicator.tsx # Step counter display
│   │   └── StepNavigation.tsx    # Previous/Next/Submit buttons
│   ├── steps/                    # Individual wizard steps
│   │   ├── PersonalStep.tsx
│   │   ├── ContactoStep.tsx
│   │   ├── DomicilioStep.tsx
│   │   ├── MedicaStep.tsx
│   │   └── ConsentimientoStep.tsx
│   ├── common/                   # Shared components
│   │   ├── FormField.tsx         # Wrapper for form inputs with labels/errors
│   │   ├── ErrorBanner.tsx       # Server error display
│   │   └── SuccessScreen.tsx     # Post-submission confirmation (shows ID + timestamp)
│   └── ui/                       # shadcn/ui primitives (Card, Button, Input, Select, etc.)
├── hooks/
│   └── usePreRegistroForm.ts    # RHF + Zod integration, API submission, error mapping
├── lib/
│   ├── step-schemas.ts          # Zod schema slices for each wizard step
│   ├── form-utils.ts            # Error mapping, field-to-step indexing helpers
│   └── utils.ts                 # General utilities (cn/clsx helpers)
└── types/
    └── (custom types if any)
```

## Development

### Start the dev server

```bash
npm run dev
```

Vite starts on `http://localhost:5173`. The dev server proxies `/api/*` requests to `http://localhost:3000` (the Node.js backend).

Ensure the backend (`@app/api`) is running separately on port 3000:

```bash
cd packages/api && npm run dev
```

### Build for production

```bash
npm run build
```

Outputs minified bundle to `dist/`.

### Run tests

```bash
npm run test
```

Tests run via Vitest with React Testing Library. Test files are colocated with components (`.test.tsx` files).

## Code Style & Linting

This workspace uses:

- **TypeScript strict mode** — configured in `tsconfig.json`
- **Tailwind CSS** — utility-first styling with v4 Vite plugin

For broader project linting (ESLint, Prettier), see the monorepo root README.

## Accessibility

The wizard is **WCAG AA compliant**:

- Focus management on step transitions (keyboard navigation)
- Semantic HTML (form, fieldset, legend, label)
- Error announcements via aria-live (error banner)
- Step-level progress indicator for screen readers
- Keyboard-accessible buttons and form controls

## Mobile-First Design

Styled with Tailwind CSS for mobile-first responsive layout:

- Base styles optimized for small screens
- `sm:`, `md:`, `lg:` breakpoints for larger displays
- Touch-friendly button sizes and spacing
- Optimized for both portrait and landscape on mobile

## License

See [LICENSE](../../LICENSE) at the monorepo root.
