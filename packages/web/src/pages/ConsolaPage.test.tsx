import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ConsolaPage from "@/pages/ConsolaPage";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const STAFF = { id: 1, nombre: "Ana", email: "ana@test.local" };

const ROW_1 = {
  id: 1,
  nombre: "Juan",
  apellidoPaterno: "Pérez",
  apellidoMaterno: "López",
  curp: "PELJ900101HDFRZN01",
  createdAt: "2026-07-30T10:00:00.000Z",
  validado: false,
  validadoEn: null,
};

const ROW_2 = {
  id: 2,
  nombre: "María",
  apellidoPaterno: "García",
  apellidoMaterno: "Hernández",
  curp: "GAHM850505MDFRRN02",
  createdAt: "2026-07-29T08:00:00.000Z",
  validado: true,
  validadoEn: "2026-07-31T09:00:00.000Z",
};

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input.toString();
}

function renderConsolaPage(entry = "/consola") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider>
        <Routes>
          <Route path="/consola" element={<ConsolaPage />} />
          <Route path="/consola/:id" element={<div>Detalle marcador</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ConsolaPage", () => {
  it("Test 1: renders full name/CURP/date/status of both rows in the desktop table given a mocked fetch returning 2 rows", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.endsWith("/api/auth/me")) {
        return Promise.resolve({ ok: true, json: async () => STAFF });
      }
      if (url.includes("/api/consola/pre-registros")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [ROW_1, ROW_2] }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderConsolaPage();

    await waitFor(() => expect(screen.getByText("Se encontraron 2 pre-registros")).toBeInTheDocument());

    // jsdom doesn't evaluate the md:block/md:hidden media queries, so both the
    // desktop table and the mobile card list render simultaneously in tests —
    // scope queries to the table (role="table") to assert desktop rendering.
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Juan Pérez López")).toBeInTheDocument();
    expect(table.getByText("PELJ900101HDFRZN01")).toBeInTheDocument();
    expect(table.getByText("María García Hernández")).toBeInTheDocument();
    expect(table.getByText("GAHM850505MDFRRN02")).toBeInTheDocument();
    expect(table.getByText("Pendiente de validación")).toBeInTheDocument();
    expect(table.getByText("Validado")).toBeInTheDocument();
  });

  it("Test 2: renders the 'Sin pre-registros' heading and 'Refrescar' button when fetch returns []", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.endsWith("/api/auth/me")) {
        return Promise.resolve({ ok: true, json: async () => STAFF });
      }
      if (url.includes("/api/consola/pre-registros")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderConsolaPage();

    expect(await screen.findByText("Sin pre-registros")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refrescar" })).toBeInTheDocument();
  });

  it("WR-04: with an active filter and zero results, shows the 'Sin resultados' state (not 'Sin pre-registros') with a clear-filters action", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.endsWith("/api/auth/me")) {
        return Promise.resolve({ ok: true, json: async () => STAFF });
      }
      if (url.includes("/api/consola/pre-registros")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderConsolaPage("/consola?nombre=zzz");

    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
    expect(screen.queryByText("Sin pre-registros")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver todos los pre-registros" })
    ).toBeInTheDocument();
  });

  it("Test 3: typing in the name search box (advancing fake timers by 300ms) triggers a SECOND fetch call whose URL contains '?nombre='", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.endsWith("/api/auth/me")) {
        return Promise.resolve({ ok: true, json: async () => STAFF });
      }
      if (url.includes("/api/consola/pre-registros")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [ROW_1] }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderConsolaPage();

    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.filter((call) => urlOf(call[0]).includes("/api/consola/pre-registros"))
      ).toHaveLength(1)
    );

    fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "Juan" } });

    await vi.advanceTimersByTimeAsync(300);

    const consolaCalls = fetchMock.mock.calls.filter((call) =>
      urlOf(call[0]).includes("/api/consola/pre-registros")
    );
    expect(consolaCalls).toHaveLength(2);
    expect(urlOf(consolaCalls[1][0])).toContain("?nombre=");
  });

  it("Test 4: clicking a row navigates to /consola/:id", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.endsWith("/api/auth/me")) {
        return Promise.resolve({ ok: true, json: async () => STAFF });
      }
      if (url.includes("/api/consola/pre-registros")) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [ROW_1] }) });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    renderConsolaPage();

    await screen.findByRole("table");
    // jsdom renders both the desktop table row and the mobile card (both have
    // role="button" with the same aria-label) — scope to the table row.
    const table = within(screen.getByRole("table"));
    const row = table.getByRole("button", { name: /Ver detalle de Juan Pérez López/ });
    await user.click(row);

    await waitFor(() => expect(screen.getByText("Detalle marcador")).toBeInTheDocument());
  });

  it("Test 5: a response with ok:false renders the generic error message in a role='alert' element", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      if (url.endsWith("/api/auth/me")) {
        return Promise.resolve({ ok: true, json: async () => STAFF });
      }
      if (url.includes("/api/consola/pre-registros")) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: { message: "No pudimos cargar los pre-registros. Intenta de nuevo." } }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderConsolaPage();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("No pudimos cargar los pre-registros. Intenta de nuevo.");
  });
});
