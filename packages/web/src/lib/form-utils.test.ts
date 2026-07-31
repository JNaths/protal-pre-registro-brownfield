import { describe, it, expect, vi } from "vitest";
import { mapServerErrorsToForm, getStepIndexByField } from "./form-utils";

describe("mapServerErrorsToForm", () => {
  it("calls setError once with the exact server field path and message (D-01)", () => {
    const setError = vi.fn();

    mapServerErrorsToForm(
      { "domicilio.codigoPostal": "Código postal debe ser 5 dígitos" },
      setError as never
    );

    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith("domicilio.codigoPostal", {
      message: "Código postal debe ser 5 dígitos",
    });
  });

  it("calls setError once per field for multiple server errors", () => {
    const setError = vi.fn();

    mapServerErrorsToForm(
      {
        "domicilio.codigoPostal": "Código postal debe ser 5 dígitos",
        nombre: "Nombre requerido",
      },
      setError as never
    );

    expect(setError).toHaveBeenCalledTimes(2);
  });
});

describe("getStepIndexByField", () => {
  it("resolves a nested domicilio field to step index 2", () => {
    expect(getStepIndexByField("domicilio.codigoPostal")).toBe(2);
  });

  it("resolves a top-level personal field to step index 0", () => {
    expect(getStepIndexByField("nombre")).toBe(0);
  });

  it("resolves consentimiento to step index 4", () => {
    expect(getStepIndexByField("consentimiento")).toBe(4);
  });

  it("resolves contacto fields (curp/rfc/email/telefono) to step index 1", () => {
    expect(getStepIndexByField("curp")).toBe(1);
    expect(getStepIndexByField("email")).toBe(1);
  });

  it("resolves infoMedica fields to step index 3", () => {
    expect(getStepIndexByField("infoMedica.tipoSangre")).toBe(3);
  });
});
