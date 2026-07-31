import { useForm, type DefaultValues, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { preRegistroSchema, type PreRegistro } from "@app/validation";
import { stepSchemas } from "@/lib/step-schemas";
import { mapServerErrorsToForm, getStepIndexByField } from "@/lib/form-utils";

const SERVER_ERROR_MESSAGE =
  "No pudimos enviar tu pre-registro. Verifica tu conexión e intenta de nuevo.";

// CR-01(b): the API returns 409 when a pre-registro with this CURP already
// exists. It is NOT a connection error, so it gets its own message that guides
// the patient to reception (the only place an existing record may be corrected).
const DUPLICATE_CURP_MESSAGE =
  "Ya existe un pre-registro con este CURP. Acude a recepción para actualizar tus datos.";

export type PreRegistroSubmitResult =
  | { success: true; id: number; createdAt: string }
  | { success: false; redirectToStep: number }
  | { success: false; error: string };

// D-05: every field consumed across all 5 wizard steps (Personal, Contacto,
// Domicilio, Médica, Consentimiento) is defaulted here so no field is ever read as
// `undefined` before the user touches it (which would mask each field's own Zod
// message behind a generic "expected string" type error). Typed as RHF's own
// `DefaultValues<T>` (a true deep-partial) rather than `Partial<T>` — `Partial<T>`
// only widens TOP-LEVEL keys to optional, so nested required objects like
// `domicilio`/`infoMedica` still demand every inner field's exact (non-undefined)
// type, rejecting `estado: undefined`/`tipoSangre: undefined` at compile time.
const DEFAULT_VALUES: DefaultValues<PreRegistro> = {
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  fechaNacimiento: "",
  sexo: undefined,
  curp: "",
  rfc: "",
  email: "",
  telefono: "",
  domicilio: {
    calle: "",
    numero: "",
    colonia: "",
    codigoPostal: "",
    estado: undefined,
    municipio: "",
  },
  infoMedica: {
    tipoSangre: undefined,
    alergias: "",
    observaciones: "",
  },
  consentimiento: false,
};

// WR-05: RHF's `formState.errors` for a nested step key (e.g. "domicilio",
// "infoMedica") is an OBJECT of child FieldErrors, not a focusable leaf, so
// `setFocus("domicilio")` matched no input and focus never moved on the nested
// steps — silently defeating the WCAG 2.4.3 focus-management intent. These
// helpers walk the error subtree for a given field and return the first
// focusable LEAF path (e.g. "domicilio.calle"). A leaf FieldError carries
// `message`/`type`/`ref`; a group node does not.
function isLeafFieldError(node: unknown): boolean {
  return (
    typeof node === "object" &&
    node !== null &&
    ("message" in node || "type" in node || "ref" in node)
  );
}

function findFirstErrorPath(node: unknown, prefix: string): string | undefined {
  if (node === undefined || node === null || typeof node !== "object") {
    return undefined;
  }
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

export function usePreRegistroForm() {
  const form = useForm<PreRegistro>({
    resolver: zodResolver(preRegistroSchema),
    mode: "onTouched", // D-05: error on blur, clears live as user corrects
    defaultValues: DEFAULT_VALUES,
  });

  async function isStepValid(stepIndex: number): Promise<boolean> {
    const stepSchema = stepSchemas[stepIndex];
    if (!stepSchema) return false;

    const fieldNames = Object.keys(stepSchema.shape) as FieldPath<PreRegistro>[];
    const isValid = await form.trigger(fieldNames);

    if (!isValid) {
      // WR-05: iterate THIS step's fields (in schema order) and descend into
      // any nested error subtree to focus the first invalid leaf input. Scoping
      // to `fieldNames` also avoids focusing a stale error left on another step.
      const errors = form.formState.errors as Record<string, unknown>;
      let focusPath: string | undefined;
      for (const name of fieldNames) {
        focusPath = findFirstErrorPath(errors[name], name);
        if (focusPath) break;
      }
      if (focusPath) {
        form.setFocus(focusPath as FieldPath<PreRegistro>);
      }
      return false;
    }

    return true;
  }

  async function onSubmit(data: PreRegistro): Promise<PreRegistroSubmitResult> {
    try {
      const response = await fetch("/api/pre-registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const { id, createdAt } = (await response.json()) as {
          id: number;
          createdAt: string;
        };
        return { success: true, id, createdAt };
      }

      if (response.status === 422) {
        const { error } = (await response.json()) as {
          error: { message: string; fields: Record<string, string> };
        };
        mapServerErrorsToForm(error.fields, form.setError);
        // WR-04: guard the empty-fields case. `Math.min(...[])` is `Infinity`,
        // which clampStep would silently pin to the LAST step — sending the
        // user to Consentimiento with a misleading "errors in a previous step"
        // banner. Fall back to the first step instead. (`onSubmit` has no
        // access to the wizard's current step, so step 0 is the safe default.)
        const stepIndexes = Object.keys(error.fields).map(getStepIndexByField);
        const redirectToStep =
          stepIndexes.length > 0 ? Math.min(...stepIndexes) : 0;
        return { success: false, redirectToStep };
      }

      if (response.status === 409) {
        return { success: false, error: DUPLICATE_CURP_MESSAGE };
      }

      return { success: false, error: SERVER_ERROR_MESSAGE };
    } catch {
      return { success: false, error: SERVER_ERROR_MESSAGE };
    }
  }

  return { form, isStepValid, onSubmit };
}
