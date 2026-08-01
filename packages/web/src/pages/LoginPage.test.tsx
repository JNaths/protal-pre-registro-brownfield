import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

// LoginPage now consumes AuthContext (CR-01), so it must render inside an
// AuthProvider. AuthProvider fires GET /api/auth/me at mount to resolve the
// session; each test's fetch mock therefore also answers that call.
function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/consola" element={<div>Consola marcador</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Correo Electrónico"), "ana@test.local");
  await user.type(screen.getByLabelText("Contraseña"), "secret123");
  await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
}

describe("LoginPage", () => {
  it("Test 1: submits credentials to /api/auth/login and navigates to /consola on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, nombre: "Ana", email: "ana@test.local" }),
    });
    global.fetch = fetchMock;

    const user = userEvent.setup();
    renderLoginPage();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByText("Consola marcador")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: "ana@test.local", password: "secret123" }),
    });
  });

  it("Test 2: shows the server's generic error message on 401 and stays on /login", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Credenciales inválidas" } }),
    });

    const user = userEvent.setup();
    renderLoginPage();
    await fillAndSubmit(user);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Credenciales inválidas");
    expect(screen.queryByText("Consola marcador")).not.toBeInTheDocument();
  });

  it("Test 3: disables the submit button and shows 'Iniciando sesión…' while the request is pending", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const user = userEvent.setup();
    renderLoginPage();
    await user.type(screen.getByLabelText("Correo Electrónico"), "ana@test.local");
    await user.type(screen.getByLabelText("Contraseña"), "secret123");
    await user.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    const button = await screen.findByRole("button", { name: "Iniciando sesión…" });
    expect(button).toBeDisabled();

    resolveFetch({ ok: true, json: async () => ({ id: 1, nombre: "Ana", email: "ana@test.local" }) });
    await waitFor(() => expect(screen.getByText("Consola marcador")).toBeInTheDocument());
  });

  it("CR-01: a successful login reaches the ProtectedRoute-guarded console instead of bouncing back to /login", async () => {
    // URL-aware mock: /me resolves 401 (no session at mount), /login resolves
    // 200 with the staff DTO. This reproduces the real SPA flow where the
    // session is unauthenticated until the user submits credentials.
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/api/auth/me")) {
        return Promise.resolve({ ok: false, status: 401 });
      }
      if (url.endsWith("/api/auth/login")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 1, nombre: "Ana", email: "ana@test.local" }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/consola" element={<div>Consola protegida</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await fillAndSubmit(user);

    // Without the CR-01 fix, ProtectedRoute would read authenticated === false
    // and render <Navigate to="/login" />, so the guarded content would never
    // appear.
    await waitFor(() => expect(screen.getByText("Consola protegida")).toBeInTheDocument());
  });
});
