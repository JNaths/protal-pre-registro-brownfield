import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import PreRegistroDetallePage from "@/pages/PreRegistroDetallePage";
import type { PreRegistroDetalle } from "@/types/preRegistroDetalle";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

const BASE_DETALLE: PreRegistroDetalle = {
  id: 1,
  nombre: "Ana",
  apellidoPaterno: "García",
  apellidoMaterno: "López",
  fechaNacimiento: "1990-01-01T00:00:00.000Z",
  sexo: "M",
  curp: "GALA900101MDFRPN01",
  rfc: null,
  email: "ana@test.local",
  telefono: "5512345678",
  createdAt: "2026-07-30T10:00:00.000Z",
  validado: false,
  validadoEn: null,
  domicilio: null,
  infoMedica: null,
  consentimiento: {
    aceptado: true,
    fechaAceptacion: "2026-07-30T10:00:00.000Z",
    versionAvisoPrivacidad: "1.0",
  },
  personal: null,
};

function mockFetch(detalle: PreRegistroDetalle, validatedResponse?: PreRegistroDetalle) {
  return vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.endsWith("/api/auth/me")) {
      return Promise.resolve({ ok: false, status: 401 });
    }

    if (url.endsWith(`/api/consola/pre-registros/${detalle.id}/validar`) && init?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: validatedResponse ?? {
            ...detalle,
            validado: true,
            validadoEn: "2026-07-31T12:00:00.000Z",
          },
        }),
      });
    }

    if (url.endsWith(`/api/consola/pre-registros/${detalle.id}`)) {
      return Promise.resolve({ ok: true, json: async () => ({ data: detalle }) });
    }

    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

function renderDetalle() {
  return render(
    <MemoryRouter initialEntries={["/consola/1"]}>
      <AuthProvider>
        <Routes>
          <Route path="/consola/:id" element={<PreRegistroDetallePage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("PreRegistroDetallePage — validación", () => {
  it("Test 1: muestra el botón 'Validar y Confirmar' habilitado con aria-label cuando validado es false", async () => {
    global.fetch = mockFetch(BASE_DETALLE) as unknown as typeof fetch;

    renderDetalle();

    const button = await screen.findByRole("button", {
      name: "Validar y confirmar el pre-registro del paciente Ana García López",
    });
    expect(button).toBeEnabled();
  });

  it("Test 2: al hacer clic en 'Validar y Confirmar' se abre el AlertDialog de confirmación", async () => {
    global.fetch = mockFetch(BASE_DETALLE) as unknown as typeof fetch;
    const user = userEvent.setup();

    renderDetalle();

    const button = await screen.findByRole("button", {
      name: "Validar y confirmar el pre-registro del paciente Ana García López",
    });
    await user.click(button);

    expect(await screen.findByText("Confirmar validación")).toBeInTheDocument();
    expect(
      screen.getByText(
        "¿Estás seguro de que quieres validar este pre-registro? Esto marcará al paciente Ana como presente y confirmará su registro. Esta acción no se puede deshacer."
      )
    ).toBeInTheDocument();
  });

  it("Test 3: hacer clic en 'Cancelar' cierra el diálogo y no dispara ningún POST", async () => {
    const fetchMock = mockFetch(BASE_DETALLE);
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    renderDetalle();

    const button = await screen.findByRole("button", {
      name: "Validar y confirmar el pre-registro del paciente Ana García López",
    });
    await user.click(button);
    await screen.findByText("Confirmar validación");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByText("Confirmar validación")).not.toBeInTheDocument());
    expect(
      fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === "POST")
    ).toBe(false);
  });

  it("Test 4: hacer clic en 'Sí, validar' dispara el POST y actualiza el badge a Validado", async () => {
    const fetchMock = mockFetch(BASE_DETALLE);
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    renderDetalle();

    const button = await screen.findByRole("button", {
      name: "Validar y confirmar el pre-registro del paciente Ana García López",
    });
    await user.click(button);
    await screen.findByText("Confirmar validación");

    await user.click(screen.getByRole("button", { name: "Sí, validar" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/consola/pre-registros/1/validar",
        expect.objectContaining({ method: "POST", credentials: "include" })
      )
    );

    const disabledButton = await screen.findByRole("button", { name: "Validado" });
    expect(disabledButton).toBeDisabled();
    expect(screen.getByRole("status", { name: /Estado: validado/ })).toBeInTheDocument();
  });

  it("Test 5: si validado ya es true en la carga inicial, el botón nace deshabilitado como 'Validado' sin ofrecer el diálogo", async () => {
    const detalleValidado: PreRegistroDetalle = {
      ...BASE_DETALLE,
      validado: true,
      validadoEn: "2026-07-30T15:00:00.000Z",
    };
    global.fetch = mockFetch(detalleValidado) as unknown as typeof fetch;

    renderDetalle();

    const button = await screen.findByRole("button", { name: "Validado" });
    expect(button).toBeDisabled();
    expect(screen.queryByText("Confirmar validación")).not.toBeInTheDocument();
  });
});
