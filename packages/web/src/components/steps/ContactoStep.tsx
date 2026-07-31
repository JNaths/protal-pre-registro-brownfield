import { useFormContext } from "react-hook-form";
import type { PreRegistro } from "@app/validation";
import { FormField } from "@/components/common/FormField";
import { Input } from "@/components/ui/input";

export function ContactoStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<PreRegistro>();

  return (
    <div>
      <h2
        data-step-heading="1"
        tabIndex={-1}
        className="mb-4 text-xl font-semibold focus:outline-none"
      >
        Contacto
      </h2>

      <FormField name="curp" label="CURP" error={errors.curp?.message}>
        <Input
          id="curp"
          type="text"
          autoComplete="off"
          className="uppercase"
          aria-invalid={!!errors.curp}
          aria-describedby={errors.curp ? "curp-error" : undefined}
          {...register("curp")}
        />
      </FormField>

      <FormField name="rfc" label="RFC" optional error={errors.rfc?.message}>
        <Input
          id="rfc"
          type="text"
          autoComplete="off"
          className="uppercase"
          aria-invalid={!!errors.rfc}
          aria-describedby={errors.rfc ? "rfc-error" : undefined}
          {...register("rfc")}
        />
      </FormField>

      <FormField name="email" label="Correo electrónico" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
      </FormField>

      <FormField name="telefono" label="Teléfono" error={errors.telefono?.message}>
        <Input
          id="telefono"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          aria-invalid={!!errors.telefono}
          aria-describedby={errors.telefono ? "telefono-error" : undefined}
          {...register("telefono")}
        />
      </FormField>
    </div>
  );
}
