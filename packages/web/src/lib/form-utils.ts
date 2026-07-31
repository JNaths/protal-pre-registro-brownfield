import type { UseFormSetError, FieldPath } from "react-hook-form";
import type { PreRegistro } from "@app/validation";

// D-01: server errors (HTTP 422, envelope `{ error: { message, fields } }`) are mapped
// back onto React Hook Form fields via `setError`. This function only PLACES the
// messages the backend already computed by revalidating the shared `preRegistroSchema`
// (see @app/validation) — it never re-derives or duplicates validation rules on the
// frontend.
export function mapServerErrorsToForm(
  errors: Record<string, string>,
  setError: UseFormSetError<PreRegistro>
): void {
  for (const [fieldName, message] of Object.entries(errors)) {
    setError(fieldName as FieldPath<PreRegistro>, { message });
  }
}

// Field-name prefix groups in fixed step order (FORM-02) — used to resolve which
// wizard step a given server-error field path belongs to, so a 422 on a field from a
// prior step can navigate the wizard back to it (Pitfall 5, 03-RESEARCH.md).
const STEP_FIELD_PREFIXES: ReadonlyArray<readonly string[]> = [
  ["nombre", "apellidoPaterno", "apellidoMaterno", "fechaNacimiento", "sexo"],
  ["curp", "rfc", "email", "telefono"],
  ["domicilio"],
  ["infoMedica"],
  ["consentimiento"],
];

export function getStepIndexByField(fieldName: string): number {
  for (let index = 0; index < STEP_FIELD_PREFIXES.length; index += 1) {
    const prefixes = STEP_FIELD_PREFIXES[index];
    if (prefixes.some((prefix) => fieldName.startsWith(prefix))) {
      return index;
    }
  }
  return 0;
}
