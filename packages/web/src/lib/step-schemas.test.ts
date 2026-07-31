import { describe, it, expect } from "vitest";
import {
  personalStepSchema,
  contactoStepSchema,
  domicilioStepSchema,
  medicaStepSchema,
  consentimientoStepSchema,
  stepSchemas,
  STEP_TITLES,
} from "@/lib/step-schemas";

// Per-step slices are .pick()ed from the shared preRegistroSchema (D-01). These tests
// pin the slicing contract: each step validates ONLY its own fields, so the wizard's
// per-step "Siguiente" gating (FORM-04) never depends on fields from other steps.

describe("personalStepSchema", () => {
  const validPersonal = {
    nombre: "Juan",
    apellidoPaterno: "Pérez",
    apellidoMaterno: "García",
    fechaNacimiento: "1993-04-11",
    sexo: "H" as const,
  };

  it("accepts a valid personal slice", () => {
    expect(personalStepSchema.safeParse(validPersonal).success).toBe(true);
  });

  it("rejects the slice when nombre is missing", () => {
    const { nombre, ...rest } = validPersonal;
    const result = personalStepSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("does not require contacto fields (curp is out of this step's scope)", () => {
    // The personal slice must pass without a curp — proving .pick() isolated the step.
    expect(personalStepSchema.safeParse(validPersonal).success).toBe(true);
  });
});

describe("contactoStepSchema", () => {
  const validContacto = {
    curp: "MOTR930411HJCRMN03",
    email: "juan.perez@example.com",
    telefono: "5512345678",
  };

  it("accepts a valid contacto slice with rfc omitted (rfc is optional)", () => {
    expect(contactoStepSchema.safeParse(validContacto).success).toBe(true);
  });

  it("rejects the slice when curp is missing", () => {
    const { curp, ...rest } = validContacto;
    expect(contactoStepSchema.safeParse(rest).success).toBe(false);
  });
});

describe("domicilioStepSchema", () => {
  const validDomicilio = {
    domicilio: {
      calle: "Calle Falsa",
      numero: "123",
      colonia: "Centro",
      codigoPostal: "28001",
      estado: "Ciudad de México",
      municipio: "Benito Juárez",
    },
  };

  it("accepts a domicilio with all 6 required fields", () => {
    expect(domicilioStepSchema.safeParse(validDomicilio).success).toBe(true);
  });

  it("rejects the slice when codigoPostal is missing (DATA-04 — all fields required)", () => {
    const { codigoPostal, ...restDomicilio } = validDomicilio.domicilio;
    const result = domicilioStepSchema.safeParse({ domicilio: restDomicilio });
    expect(result.success).toBe(false);
  });
});

describe("medicaStepSchema", () => {
  it("passes when infoMedica is omitted entirely (DATA-05 — optional section)", () => {
    expect(medicaStepSchema.safeParse({}).success).toBe(true);
  });

  it("passes when infoMedica is present but every field is empty/undefined", () => {
    const result = medicaStepSchema.safeParse({
      infoMedica: { tipoSangre: undefined, alergias: "", observaciones: "" },
    });
    expect(result.success).toBe(true);
  });
});

describe("consentimientoStepSchema", () => {
  it("accepts consentimiento === true", () => {
    expect(consentimientoStepSchema.safeParse({ consentimiento: true }).success).toBe(true);
  });

  it("rejects consentimiento === false (DATA-06 — explicit acceptance required)", () => {
    expect(consentimientoStepSchema.safeParse({ consentimiento: false }).success).toBe(false);
  });
});

describe("stepSchemas / STEP_TITLES", () => {
  it("exposes the 5 step schemas in FORM-02 order", () => {
    expect(stepSchemas).toHaveLength(5);
    expect(stepSchemas[0]).toBe(personalStepSchema);
    expect(stepSchemas[1]).toBe(contactoStepSchema);
    expect(stepSchemas[2]).toBe(domicilioStepSchema);
    expect(stepSchemas[3]).toBe(medicaStepSchema);
    expect(stepSchemas[4]).toBe(consentimientoStepSchema);
  });

  it("exposes the 5 step titles verbatim from the UI-SPEC, in order", () => {
    expect(STEP_TITLES).toEqual([
      "Datos personales",
      "Contacto",
      "Domicilio",
      "Información médica",
      "Consentimiento",
    ]);
  });

  it("has one title per step schema", () => {
    expect(STEP_TITLES).toHaveLength(stepSchemas.length);
  });
});
