import { Controller, useFormContext } from "react-hook-form";
import type { PreRegistro } from "@app/validation";
import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function PersonalStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PreRegistro>();

  return (
    <div>
      <h2
        data-step-heading="0"
        tabIndex={-1}
        className="mb-4 text-xl font-semibold focus:outline-none"
      >
        Datos personales
      </h2>

      <FormField name="nombre" label="Nombre" error={errors.nombre?.message}>
        <Input
          id="nombre"
          type="text"
          autoComplete="given-name"
          aria-invalid={!!errors.nombre}
          aria-describedby={errors.nombre ? "nombre-error" : undefined}
          {...register("nombre")}
        />
      </FormField>

      <FormField
        name="apellidoPaterno"
        label="Apellido paterno"
        error={errors.apellidoPaterno?.message}
      >
        <Input
          id="apellidoPaterno"
          type="text"
          autoComplete="family-name"
          aria-invalid={!!errors.apellidoPaterno}
          aria-describedby={errors.apellidoPaterno ? "apellidoPaterno-error" : undefined}
          {...register("apellidoPaterno")}
        />
      </FormField>

      <FormField
        name="apellidoMaterno"
        label="Apellido materno"
        error={errors.apellidoMaterno?.message}
      >
        <Input
          id="apellidoMaterno"
          type="text"
          autoComplete="family-name"
          aria-invalid={!!errors.apellidoMaterno}
          aria-describedby={errors.apellidoMaterno ? "apellidoMaterno-error" : undefined}
          {...register("apellidoMaterno")}
        />
      </FormField>

      <FormField
        name="fechaNacimiento"
        label="Fecha de nacimiento"
        error={errors.fechaNacimiento?.message}
      >
        <Input
          id="fechaNacimiento"
          type="date"
          aria-invalid={!!errors.fechaNacimiento}
          aria-describedby={errors.fechaNacimiento ? "fechaNacimiento-error" : undefined}
          {...register("fechaNacimiento")}
        />
      </FormField>

      <FormField name="sexo" label="Sexo" error={errors.sexo?.message}>
        <Controller
          name="sexo"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value ?? ""}
              onValueChange={field.onChange}
              aria-invalid={!!errors.sexo}
              aria-describedby={errors.sexo ? "sexo-error" : undefined}
              className="flex flex-row flex-wrap gap-4"
            >
              <span className="flex items-center gap-2">
                <RadioGroupItem value="H" id="sexo-h" />
                <Label htmlFor="sexo-h">Hombre</Label>
              </span>
              <span className="flex items-center gap-2">
                <RadioGroupItem value="M" id="sexo-m" />
                <Label htmlFor="sexo-m">Mujer</Label>
              </span>
              <span className="flex items-center gap-2">
                <RadioGroupItem value="X" id="sexo-x" />
                <Label htmlFor="sexo-x">X</Label>
              </span>
            </RadioGroup>
          )}
        />
      </FormField>
    </div>
  );
}
