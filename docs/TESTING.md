<!-- generated-by: gsd-doc-writer -->

# Testing

## Test Framework and Setup

This project uses **Vitest 4.1.10** as the test runner across all three workspaces. Each workspace has its own configuration tailored to its environment and dependencies:

- **packages/validation**: Node.js environment, validates Zod schemas for pre-registration data shapes, CURP/RFC checksums, and field-level validation rules
- **packages/api**: Node.js environment with integration tests using supertest; tests the Express API against a live PostgreSQL database (no mocking)
- **packages/web**: Browser-like environment (jsdom) with React Testing Library; tests React components, form interactions, and multi-step wizard flows

### Configuration Details

**packages/api/vitest.config.ts** and **vitest.setup.ts:**
- Runs tests sequentially in a single fork (`fileParallelism: false`, `singleFork: true`)
- Loads the root `.env` file before running tests (required for `DATABASE_URL` and `DIRECT_URL`)
- Reason: Integration tests share a single external Neon database; parallel execution causes race conditions on database-mutating tests (e.g., two workers POST-ing the same CURP simultaneously)

**packages/web/vitest.config.ts** and **vitest.setup.ts:**
- jsdom environment with React plugin enabled
- Test timeout raised to 15 seconds (from default 5 seconds) to accommodate full-suite CPU contention during multi-step form fills and Radix UI Select interactions
- Polyfills for missing jsdom APIs:
  - `Element.prototype.hasPointerCapture`, `setPointerCapture`, `releasePointerCapture` — required by Radix UI's Select component
  - `Element.prototype.scrollIntoView` — called when Select opens to position its content
- Without these polyfills, tests that use Select throw "target.hasPointerCapture is not a function"

**packages/validation/vitest.config.ts:**
- Simple Node.js configuration with globals enabled

## Running Tests

### Run all tests across all workspaces

```bash
npm test
```

This executes `vitest run` in each workspace (`packages/api`, `packages/validation`, `packages/web`) and displays results from all three.

### Run tests for a single workspace

From the project root:

```bash
npm test --workspace=@app/validation
npm test --workspace=@app/api
npm test --workspace=@app/web
```

Or navigate into a workspace and run locally:

```bash
cd packages/validation && npm test
```

### Run tests in watch mode

```bash
cd packages/web && npm run test -- --watch
```

(Note: Watch mode is not configured in root package.json scripts; run `vitest` directly in a workspace.)

## Writing New Tests

### File Naming Conventions

- **Validation tests**: `packages/validation/__tests__/{module}.test.ts` (e.g., `curp.test.ts`, `pre-registro.test.ts`)
- **API tests**: `packages/api/src/{feature}/*.test.ts` (e.g., `routes/pre-registros.test.ts`, `utils/logger.test.ts`)
- **Web tests**: `packages/web/src/{feature}/*.test.tsx` (e.g., `components/steps/PersonalStep.test.tsx`, `lib/form-utils.test.ts`)

### Test Helper Patterns

**Validation tests:**
- Use `describe()` and `it()` from Vitest with `expect()` assertions
- Test Zod schemas directly: `schema.safeParse(payload)` and check `result.success` and `result.error.issues`
- Example (from `curp.test.ts`):
  ```typescript
  describe("curpSchema", () => {
    it("accepts a confirmed-valid CURP with sex char H", () => {
      const result = curpSchema.safeParse("MOTR930411HJCRMN03");
      expect(result.success).toBe(true);
    });
    
    it("rejects a CURP with an invalid checksum", () => {
      const result = curpSchema.safeParse("MOTR930411HJCRMN09");
      expect(result.success).toBe(false);
    });
  });
  ```

**API tests:**
- Use supertest to make HTTP requests against the imported Express `app` (do not call `app.listen()`)
- Set up fixtures before/after all tests with `beforeAll()` and `afterAll()` to clean up database state
- Example (from `pre-registros.test.ts`):
  ```typescript
  describe("POST /api/pre-registros", () => {
    beforeAll(async () => {
      // Clean test fixtures from database
      await prisma.preRegistro.deleteMany({ where: { curp: { in: TEST_CURPS } } });
    });
    
    it("creates a PreRegistro and returns 200", async () => {
      const res = await request(app)
        .post("/api/pre-registros")
        .send({ /* valid payload */ });
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Registro creado");
    });
  });
  ```

**Web tests:**
- Use `render()` from @testing-library/react to mount components
- Use `userEvent.setup()` for user interactions (typing, clicking, etc.)
- Use `screen.getByRole()`, `screen.getByLabelText()`, and `screen.findByRole()` (async) for element queries
- Wrap components in providers (e.g., FormProvider for form tests)
- Mock `fetch` with `vi.fn()` for API calls
- Example (from `PersonalStep.test.tsx`):
  ```typescript
  describe("PersonalStep", () => {
    it("shows the schema-sourced error when nombre is blurred empty", async () => {
      const user = userEvent.setup();
      render(<Wrapper />);
      
      const nombreInput = screen.getByLabelText("Nombre");
      await user.click(nombreInput);
      await user.tab();
      
      expect(await screen.findByText("Nombre requerido")).toBeInTheDocument();
    });
  });
  ```

### Cross-Step Integration Testing

The wizard's multi-step forms are tested end-to-end in `PreRegistroWizard.test.tsx`. It uses a helper function `fillAllStepsToConsentimiento()` that:
- Fills all 5 steps (Personal → Contacto → Domicilio → Médica → Consentimiento) with valid data
- Uses userEvent to type into fields, click radio buttons, select from dropdowns, and navigate between steps
- Verifies server error handling (422 validation errors map back to their step, 409 duplicate CURP errors, etc.)

When adding tests for a new step, ensure:
1. The step schema is tested in isolation in `step-schemas.test.ts`
2. The component is tested for rendering, validation errors, and user interactions
3. The wizard integration test covers the new step in the full flow

## Coverage Requirements

No coverage thresholds are currently configured. Test count by layer:

| Layer | Test Files | Test Cases | Purpose |
|-------|-----------|-----------|---------|
| Validation | 7 | 44 | Zod schema shapes, CURP/RFC validation, field-level rules |
| API | 4 | 18 | POST /api/pre-registros endpoint, DB persistence, security (XSS sanitization, PII redaction in logs), health check |
| Web | 12 | 59 | Component rendering, form validation, wizard navigation, error mapping to steps |

## CI Integration

No CI/CD pipeline is currently configured. To add automated test runs, create a `.github/workflows/test.yml` file that:
1. Triggers on push and pull requests
2. Installs dependencies with `npm install`
3. Runs `npm test`
4. Optionally uploads coverage reports

Example workflow structure (not yet implemented):
```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
      - run: npm test
```
