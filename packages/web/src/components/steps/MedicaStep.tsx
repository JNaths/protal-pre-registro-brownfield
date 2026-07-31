import { Controller, useFormContext } from "react-hook-form";
import type { PreRegistro } from "@app/validation";
import { FormField } from "@/components/common/FormField";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIPOS_SANGRE = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;

export function MedicaStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PreRegistro>();

  const infoMedicaErrors = errors.infoMedica;

  return (
    <div>
      <h2
        data-step-heading="3"
        tabIndex={-1}
        className="mb-4 text-xl font-semibold focus:outline-none"
      >
        Información médica
      </h2>

      <FormField
        name="infoMedica.tipoSangre"
        label="Tipo de sangre"
        optional
        error={infoMedicaErrors?.tipoSangre?.message}
      >
        <Controller
          name="infoMedica.tipoSangre"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger
                id="infoMedica.tipoSangre"
                className="w-full"
                aria-invalid={!!infoMedicaErrors?.tipoSangre}
                aria-describedby={
                  infoMedicaErrors?.tipoSangre ? "infoMedica.tipoSangre-error" : undefined
                }
              >
                <SelectValue placeholder="Selecciona un tipo de sangre" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_SANGRE.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField
        name="infoMedica.alergias"
        label="Alergias"
        optional
        error={infoMedicaErrors?.alergias?.message}
      >
        <Textarea
          id="infoMedica.alergias"
          aria-invalid={!!infoMedicaErrors?.alergias}
          aria-describedby={
            infoMedicaErrors?.alergias ? "infoMedica.alergias-error" : undefined
          }
          {...register("infoMedica.alergias")}
        />
      </FormField>

      <FormField
        name="infoMedica.observaciones"
        label="Observaciones"
        optional
        error={infoMedicaErrors?.observaciones?.message}
      >
        <Textarea
          id="infoMedica.observaciones"
          aria-invalid={!!infoMedicaErrors?.observaciones}
          aria-describedby={
            infoMedicaErrors?.observaciones ? "infoMedica.observaciones-error" : undefined
          }
          {...register("infoMedica.observaciones")}
        />
      </FormField>
    </div>
  );
}
