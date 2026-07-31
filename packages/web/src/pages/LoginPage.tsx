import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/common/BrandMark";

const FALLBACK_ERROR_MESSAGE = "Hubo un error al conectar. Intenta de nuevo.";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // CR-01: push the fresh session into AuthContext BEFORE navigating so
        // ProtectedRoute sees `authenticated === true`. The login route returns
        // the safe { id, nombre, email } DTO — feed it straight into the context.
        const staff = (await res.json().catch(() => null)) as
          | { id: number; nombre: string; email: string }
          | null;
        if (staff) {
          login(staff);
        }
        navigate("/consola");
        return;
      }

      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? FALLBACK_ERROR_MESSAGE);
    } catch {
      setError(FALLBACK_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-app-gradient flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <Card className="rounded-2xl border-border/70 shadow-xl shadow-brand-900/5 ring-1 ring-black/[0.02]">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a la consola de recepción.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="nombre@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Contraseña"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
            {error && (
              <p role="alert" aria-live="assertive" className="text-sm text-destructive-text">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting} aria-busy={submitting}>
              {submitting ? "Iniciando sesión…" : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso exclusivo para personal de recepción.
        </p>
      </div>
    </main>
  );
}
