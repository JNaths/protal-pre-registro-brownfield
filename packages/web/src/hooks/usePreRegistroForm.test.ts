import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePreRegistroForm } from "./usePreRegistroForm";
import type { PreRegistro } from "@app/validation";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("usePreRegistroForm onSubmit", () => {
  it("returns { success: true, id, createdAt } when the API responds 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: "Registro creado",
        id: 42,
        createdAt: "2026-07-17T00:00:00.000Z",
      }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => usePreRegistroForm());

    let response: unknown;
    await act(async () => {
      response = await result.current.onSubmit({} as PreRegistro);
    });

    expect(response).toEqual({
      success: true,
      id: 42,
      createdAt: "2026-07-17T00:00:00.000Z",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/pre-registros",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns success:false with redirectToStep computed from the lowest step among 422 field errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: {
          message: "Validación fallida",
          fields: {
            "domicilio.codigoPostal": "Código postal debe ser 5 dígitos",
            nombre: "Nombre requerido",
          },
        },
      }),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => usePreRegistroForm());

    let response: unknown;
    await act(async () => {
      response = await result.current.onSubmit({} as PreRegistro);
    });

    expect(response).toEqual({ success: false, redirectToStep: 0 });
  });

  it("returns the generic connection-error message on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const { result } = renderHook(() => usePreRegistroForm());

    let response: unknown;
    await act(async () => {
      response = await result.current.onSubmit({} as PreRegistro);
    });

    expect(response).toEqual({
      success: false,
      error: "No pudimos enviar tu pre-registro. Verifica tu conexión e intenta de nuevo.",
    });
  });
});
