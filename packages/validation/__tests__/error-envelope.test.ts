import { describe, it, expect } from "vitest";
import type { z } from "zod";
import { zodIssuesToErrorEnvelope } from "../src/error-envelope";

function issue(path: string, message: string): z.ZodIssue {
  return { code: "custom", path: [path], message } as unknown as z.ZodIssue;
}

describe("zodIssuesToErrorEnvelope", () => {
  it("maps a two-issue array into one entry per field path", () => {
    const issues = [issue("curp", "CURP inválida"), issue("email", "Correo inválido")];
    const result = zodIssuesToErrorEnvelope(issues);
    expect(result).toEqual({
      error: {
        message: "Validación fallida",
        fields: {
          curp: "CURP inválida",
          email: "Correo inválido",
        },
      },
    });
  });

  it("keeps only the first message when two issues share the same field path", () => {
    const issues = [
      issue("curp", "Primer error"),
      issue("curp", "Segundo error"),
    ];
    const result = zodIssuesToErrorEnvelope(issues);
    expect(result.error.fields.curp).toBe("Primer error");
  });

  it("returns an empty fields object for an empty issues array", () => {
    const result = zodIssuesToErrorEnvelope([]);
    expect(result).toEqual({
      error: {
        message: "Validación fallida",
        fields: {},
      },
    });
  });

  it("overrides the default message when a custom defaultMessage is passed", () => {
    const result = zodIssuesToErrorEnvelope([], "Mensaje personalizado");
    expect(result.error.message).toBe("Mensaje personalizado");
  });
});
