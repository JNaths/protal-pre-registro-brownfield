import { Controller, useFormContext } from "react-hook-form";
import { MEXICAN_STATES, type PreRegistro } from "@app/validation";
import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DomicilioStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PreRegistro>();

  const domicilioErrors = errors.domicilio;

  return (
    <div>
      <h2
        data-step-heading="2"
        tabIndex={-1}
        className="mb-4 text-xl font-semibold focus:outline-none"
      >
        Domicilio
      </h2>

      <FormField name="domicilio.calle" label="Calle" error={domicilioErrors?.calle?.message}>
        <Input
          id="domicilio.calle"
          type="text"
          autoComplete="street-address"
          aria-invalid={!!domicilioErrors?.calle}
          aria-describedby={domicilioErrors?.calle ? "domicilio.calle-error" : undefined}
          {...register("domicilio.calle")}
        />
      </FormField>

      <FormField name="domicilio.numero" label="Número" error={domicilioErrors?.numero?.message}>
        <Input
          id="domicilio.numero"
          type="text"
          aria-invalid={!!domicilioErrors?.numero}
          aria-describedby={domicilioErrors?.numero ? "domicilio.numero-error" : undefined}
          {...register("domicilio.numero")}
        />
      </FormField>

      <FormField
        name="domicilio.colonia"
        label="Colonia"
        error={domicilioErrors?.colonia?.message}
      >
        <Input
          id="domicilio.colonia"
          type="text"
          autoComplete="street-address"
          aria-invalid={!!domicilioErrors?.colonia}
          aria-describedby={domicilioErrors?.colonia ? "domicilio.colonia-error" : undefined}
          {...register("domicilio.colonia")}
        />
      </FormField>

      <FormField
        name="domicilio.codigoPostal"
        label="Código postal"
        error={domicilioErrors?.codigoPostal?.message}
      >
        <Input
          id="domicilio.codigoPostal"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          aria-invalid={!!domicilioErrors?.codigoPostal}
          aria-describedby={
            domicilioErrors?.codigoPostal ? "domicilio.codigoPostal-error" : undefined
          }
          {...register("domicilio.codigoPostal")}
        />
      </FormField>

      <FormField name="domicilio.estado" label="Estado" error={domicilioErrors?.estado?.message}>
        <Controller
          name="domicilio.estado"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger
                id="domicilio.estado"
                className="w-full"
                aria-invalid={!!domicilioErrors?.estado}
                aria-describedby={domicilioErrors?.estado ? "domicilio.estado-error" : undefined}
              >
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {MEXICAN_STATES.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField
        name="domicilio.municipio"
        label="Municipio"
        error={domicilioErrors?.municipio?.message}
      >
        <Input
          id="domicilio.municipio"
          type="text"
          aria-invalid={!!domicilioErrors?.municipio}
          aria-describedby={
            domicilioErrors?.municipio ? "domicilio.municipio-error" : undefined
          }
          {...register("domicilio.municipio")}
        />
      </FormField>
    </div>
  );
}
