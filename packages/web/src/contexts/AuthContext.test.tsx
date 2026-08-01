import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function Probe() {
  const { loading, authenticated, staff } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authenticated">{String(authenticated)}</span>
      <span data-testid="staff">{staff ? staff.email : "null"}</span>
    </div>
  );
}

describe("AuthContext", () => {
  it("Test 1: loading is true while GET /api/auth/me is pending", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading").textContent).toBe("true");

    // Clean up the pending promise so the test doesn't leak into others.
    resolveFetch({ ok: false, status: 401 });
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
  });

  it("Test 2: resolves authenticated true + staff data when /me returns ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, nombre: "Ana", email: "ana@test.local" }),
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("authenticated").textContent).toBe("true");
    expect(screen.getByTestId("staff").textContent).toBe("ana@test.local");
  });

  it("Test 3: resolves authenticated false + staff null when /me returns 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(screen.getByTestId("staff").textContent).toBe("null");
  });

  it("Test 4: logout() calls POST /api/auth/logout and clears authenticated/staff", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, nombre: "Ana", email: "ana@test.local" }),
    });
    global.fetch = fetchMock;

    function LogoutProbe() {
      const { authenticated, staff, logout } = useAuth();
      return (
        <div>
          <span data-testid="authenticated">{String(authenticated)}</span>
          <span data-testid="staff">{staff ? staff.email : "null"}</span>
          <button onClick={() => logout()}>logout</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("authenticated").textContent).toBe("true"));

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Sesión cerrada" }) });
    screen.getByRole("button", { name: "logout" }).click();

    await waitFor(() => expect(screen.getByTestId("authenticated").textContent).toBe("false"));
    expect(screen.getByTestId("staff").textContent).toBe("null");
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  });
});
