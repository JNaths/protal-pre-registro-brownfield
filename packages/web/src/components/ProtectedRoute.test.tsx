import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/consola"]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login marcador</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/consola" element={<div>Consola marcador</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("Test 5: redirects to /login when session resolves unauthenticated (401)", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    renderProtected();

    await waitFor(() => expect(screen.getByText("Login marcador")).toBeInTheDocument());
    expect(screen.queryByText("Consola marcador")).not.toBeInTheDocument();
  });

  it("Test 6: renders the nested Outlet route when session resolves authenticated (200)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, nombre: "Ana", email: "ana@test.local" }),
    });

    renderProtected();

    await waitFor(() => expect(screen.getByText("Consola marcador")).toBeInTheDocument());
    expect(screen.queryByText("Login marcador")).not.toBeInTheDocument();
  });
});
