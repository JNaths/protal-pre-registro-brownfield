import { describe, it, expect } from "vitest";
import { preRegistroSchema } from "../src/pre-registro";

const validPayload = {
  nombre: "Juan",
  apellidoPaterno: "Pérez",
  apellidoMaterno: "García",
  fechaNacimiento: "1993-04-11",
  sexo: "H" as const,
  curp: "MOTR930411HJCRMN03",
  email: "juan.perez@example.com",
  telefono: "5512345678",
  domicilio: {
    calle: "Calle Falsa",
    numero: "123",
    colonia: "Centro",
    codigoPostal: "28001",
    estado: "Ciudad de México",
    municipio: "Benito Juárez",
  },
  consentimiento: true,
};

describe("preRegistroSchema", () => {
  it("accepts a complete, valid payload (no RFC, consentimiento true)", () => {
    const result = preRegistroSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects the payload when nombre is missing, identifying the field", () => {
    const { nombre, ...rest } = validPayload;
    const result = preRegistroSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((issue) => issue.path.join("."));
      expect(issuePaths).toContain("nombre");
    }
  });

  it("rejects the payload when consentimiento is false", () => {
    const result = preRegistroSchema.safeParse({ ...validPayload, consentimiento: false });
    expect(result.success).toBe(false);
  });

  it("rejects the payload when curp is invalid (checksum failure from Task 1 fixture)", () => {
    const result = preRegistroSchema.safeParse({
      ...validPayload,
      curp: "MOTR930411HJCRMN09",
    });
    expect(result.success).toBe(false);
  });

  it("accepts the payload when rfc is omitted entirely (stays optional at composed level)", () => {
    const result = preRegistroSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    expect("rfc" in validPayload).toBe(false);
  });

  it("accepts the payload with a confirmed-valid rfc present", () => {
    const result = preRegistroSchema.safeParse({ ...validPayload, rfc: "MHTR93041179A" });
    expect(result.success).toBe(true);
  });

  it("accepts a complete, valid domicilio with no infoMedica fields set (D-04, D-06)", () => {
    const result = preRegistroSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects domicilio.codigoPostal when it is not 5 digits, identifying the field", () => {
    const result = preRegistroSchema.safeParse({
      ...validPayload,
      domicilio: { ...validPayload.domicilio, codigoPostal: "ABC12" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((issue) => issue.path.join("."));
      expect(issuePaths).toContain("domicilio.codigoPostal");
    }
  });

  it("rejects domicilio.estado when it is not one of the 32 Mexican states", () => {
    const result = preRegistroSchema.safeParse({
      ...validPayload,
      domicilio: { ...validPayload.domicilio, estado: "Not A State" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects the payload when domicilio is missing entirely (required per D-06)", () => {
    const { domicilio, ...rest } = validPayload;
    const result = preRegistroSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts the payload with a fully-populated optional infoMedica", () => {
    const result = preRegistroSchema.safeParse({
      ...validPayload,
      infoMedica: {
        tipoSangre: "O+",
        alergias: "Penicilina",
        observaciones: "Paciente diabético",
      },
    });
    expect(result.success).toBe(true);
  });
});
