import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Correo inválido");

// Mexican 10-digit phone: strip all non-digit characters, then strip a leading "52"
// country-code prefix only when that leaves exactly 10 digits (avoids misinterpreting a
// legitimate 12-digit local number, which does not occur in Mexico, as a false country-code
// match). The final .pipe() guarantees the validated output is always exactly 10 digits.
export const phoneSchema = z
  .string()
  .transform((value) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 12 && digitsOnly.startsWith("52")) {
      return digitsOnly.slice(2);
    }
    return digitsOnly;
  })
  .pipe(
    z
      .string()
      .length(10, "Teléfono debe tener 10 dígitos")
      .regex(/^\d{10}$/, "Teléfono debe tener 10 dígitos")
  );

export type Email = z.infer<typeof emailSchema>;
export type Phone = z.infer<typeof phoneSchema>;
