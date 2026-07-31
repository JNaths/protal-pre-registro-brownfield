import { z } from "zod";
import { curpSchema } from "./curp";
import { rfcSchema } from "./rfc";
import { emailSchema, phoneSchema } from "./contact";
import { estadoSchema } from "./estados";

export const preRegistroSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(100, "Nombre demasiado largo"),
  apellidoPaterno: z
    .string()
    .min(1, "Apellido paterno requerido")
    .max(100, "Apellido paterno demasiado largo"),
  apellidoMaterno: z
    .string()
    .min(1, "Apellido materno requerido")
    .max(100, "Apellido materno demasiado largo"),
  fechaNacimiento: z
    .string()
    .date("Fecha de nacimiento inválida")
    .refine((d) => new Date(d) <= new Date(), {
      message: "La fecha de nacimiento no puede ser futura",
    }),
  sexo: z.enum(["H", "M", "X"], { message: "Sexo inválido" }),
  curp: curpSchema,
  rfc: rfcSchema.optional(),
  email: emailSchema,
  telefono: phoneSchema,
  domicilio: z.object({
    calle: z.string().min(1, "Calle requerida").max(100, "Calle demasiado larga"),
    numero: z.string().min(1, "Número requerido").max(100, "Número demasiado largo"),
    colonia: z.string().min(1, "Colonia requerida").max(100, "Colonia demasiado larga"),
    codigoPostal: z.string().regex(/^\d{5}$/, "Código postal debe ser 5 dígitos"),
    estado: estadoSchema,
    municipio: z.string().min(1, "Municipio requerido").max(100, "Municipio demasiado largo"),
  }),
  infoMedica: z
    .object({
      tipoSangre: z
        .enum(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"], {
          message: "Tipo de sangre inválido",
        })
        .optional(),
      alergias: z.string().max(1000, "Alergias demasiado largas").optional(),
      observaciones: z.string().max(1000, "Observaciones demasiado largas").optional(),
    })
    .optional(),
  consentimiento: z.boolean().refine((val) => val === true, {
    message: "Debe aceptar el aviso de privacidad",
  }),
});

export type PreRegistro = z.infer<typeof preRegistroSchema>;
