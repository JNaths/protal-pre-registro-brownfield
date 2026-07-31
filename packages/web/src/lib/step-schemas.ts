import { preRegistroSchema } from "@app/validation";

// Step 0: Datos personales
export const personalStepSchema = preRegistroSchema.pick({
  nombre: true,
  apellidoPaterno: true,
  apellidoMaterno: true,
  fechaNacimiento: true,
  sexo: true,
});

// Step 1: Contacto (incluye fiscal: CURP/RFC)
export const contactoStepSchema = preRegistroSchema.pick({
  curp: true,
  rfc: true,
  email: true,
  telefono: true,
});

// Step 2: Domicilio
export const domicilioStepSchema = preRegistroSchema.pick({
  domicilio: true,
});

// Step 3: Información médica
export const medicaStepSchema = preRegistroSchema.pick({
  infoMedica: true,
});

// Step 4: Consentimiento
export const consentimientoStepSchema = preRegistroSchema.pick({
  consentimiento: true,
});

// Orden fijo de pasos (FORM-02) — usado para el gating de "Siguiente" por paso.
export const stepSchemas = [
  personalStepSchema,
  contactoStepSchema,
  domicilioStepSchema,
  medicaStepSchema,
  consentimientoStepSchema,
] as const;

// Copy verbatim del contrato de copywriting de 03-UI-SPEC.md — no parafrasear.
export const STEP_TITLES = [
  "Datos personales",
  "Contacto",
  "Domicilio",
  "Información médica",
  "Consentimiento",
] as const;
