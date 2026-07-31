import { Controller, useFormContext } from "react-hook-form";
import type { PreRegistro } from "@app/validation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function ConsentimientoStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<PreRegistro>();

  return (
    <div>
      <h2
        data-step-heading="4"
        tabIndex={-1}
        className="mb-4 text-xl font-semibold focus:outline-none"
      >
        Consentimiento
      </h2>

      <Controller
        name="consentimiento"
        control={control}
        render={({ field }) => (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="consentimiento"
                checked={field.value ?? false}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={!!errors.consentimiento}
                aria-describedby={
                  errors.consentimiento ? "consentimiento-error" : "consentimiento-helper"
                }
              />
              <Label htmlFor="consentimiento">Acepto el aviso de privacidad</Label>
            </div>
            {errors.consentimiento?.message ? (
              <p
                id="consentimiento-error"
                role="alert"
                className="mt-1 text-sm text-destructive-text"
              >
                {errors.consentimiento.message}
              </p>
            ) : !field.value ? (
              <p id="consentimiento-helper" className="mt-1 text-sm text-muted-foreground">
                Debes aceptar el aviso de privacidad para enviar tu pre-registro.
              </p>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
