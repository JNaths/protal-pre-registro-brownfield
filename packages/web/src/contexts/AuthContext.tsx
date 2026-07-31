import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Staff = { id: number; nombre: string; email: string };

type AuthContextValue = {
  loading: boolean;
  authenticated: boolean;
  staff: Staff | null;
  /**
   * CR-01: Reflect a fresh login into the context synchronously from the login
   * response body. `AuthProvider` resolves the session only once at mount
   * (D-08, flicker-free), so without this the SPA never sees `authenticated`
   * flip to `true` after login and `ProtectedRoute` bounces the user back to
   * `/login`. The login route already returns the safe `{ id, nombre, email }`
   * DTO, so no extra `/me` round-trip is needed.
   */
  login: (staff: Staff) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [staff, setStaff] = useState<Staff | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolveSession() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as Staff;
          setAuthenticated(true);
          setStaff(data);
        } else {
          setAuthenticated(false);
          setStaff(null);
        }
      } catch {
        if (cancelled) return;
        setAuthenticated(false);
        setStaff(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void resolveSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      authenticated,
      staff,
      login: (loggedInStaff: Staff) => {
        setStaff(loggedInStaff);
        setAuthenticated(true);
      },
      logout: async () => {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        setAuthenticated(false);
        setStaff(null);
      },
    }),
    [loading, authenticated, staff]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
