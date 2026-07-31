import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Inbox, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { PreRegistroSearchBar } from "@/components/PreRegistroSearchBar";
import { PreRegistroTable } from "@/components/PreRegistroTable";
import { PreRegistroCard } from "@/components/PreRegistroCard";
import type { PreRegistroRow } from "@/types/preRegistro";

const FALLBACK_ERROR_MESSAGE = "No pudimos cargar los pre-registros. Intenta de nuevo.";

export default function ConsolaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<PreRegistroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadPreRegistros(filters?: { nombre?: string; fecha?: string }) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.nombre) params.append("nombre", filters.nombre);
      if (filters?.fecha) params.append("fecha", filters.fecha);

      const res = await fetch(`/api/consola/pre-registros?${params}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setRows(data.data);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? FALLBACK_ERROR_MESSAGE);
      }
    } catch {
      setError(FALLBACK_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPreRegistros({
      nombre: searchParams.get("nombre") ?? undefined,
      fecha: searchParams.get("fecha") ?? undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(nombre: string, fecha: string | null) {
    const next = new URLSearchParams();
    if (nombre) next.set("nombre", nombre);
    if (fecha) next.set("fecha", fecha);
    setSearchParams(next);
    void loadPreRegistros({ nombre: nombre || undefined, fecha: fecha ?? undefined });
  }

  // WR-04: an active filter (nombre or fecha in the URL) means a zero-result
  // list is "no matches for your search", not "no registros exist yet". The two
  // empty states need different copy and different actions.
  const activeNombre = searchParams.get("nombre") ?? "";
  const activeFecha = searchParams.get("fecha") ?? "";
  const hasActiveFilter = Boolean(activeNombre || activeFecha);

  return (
    <div className="min-h-screen bg-background">
      <ConsoleHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Consola de Recepción</h1>
          <p className="mt-1 text-muted-foreground">Gestionar pre-registros de pacientes</p>
        </div>

        <Card className="rounded-2xl border-border/70 p-4 shadow-sm sm:p-5">
          <PreRegistroSearchBar
            initialNombre={searchParams.get("nombre") ?? ""}
            initialFecha={searchParams.get("fecha") ?? ""}
            onSearch={handleSearch}
          />
        </Card>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive-text"
          >
            {error}
          </div>
        )}

        {loading && (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Cargando pre-registros…</span>
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-0"
                >
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="hidden h-4 w-44 animate-pulse rounded bg-muted sm:block" />
                  <div className="hidden h-4 w-24 animate-pulse rounded bg-muted md:block" />
                  <div className="ml-auto h-5 w-28 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && rows.length === 0 && hasActiveFilter && (
          <Card className="mx-auto max-w-md rounded-2xl border-border/70 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <span
                aria-hidden="true"
                className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
              >
                <SearchX className="size-7" />
              </span>
              <h2 className="text-xl font-semibold">Sin resultados</h2>
              <p className="text-muted-foreground">
                Ningún pre-registro coincide con tu búsqueda. Ajusta o limpia los
                filtros para ver más resultados.
              </p>
              {/* Clearing via handleSearch keeps URL, search-bar inputs, and
                  results in sync (WR-04). */}
              <Button onClick={() => handleSearch("", null)}>Ver todos los pre-registros</Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && rows.length === 0 && !hasActiveFilter && (
          <Card className="mx-auto max-w-md rounded-2xl border-border/70 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <span
                aria-hidden="true"
                className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700"
              >
                <Inbox className="size-7" />
              </span>
              <h2 className="text-xl font-semibold">Sin pre-registros</h2>
              <p className="text-muted-foreground">
                Aún no hay pre-registros enviados. Actualiza la página para ver nuevos registros.
              </p>
              {/* No filter is active here, so reloading with the current (empty)
                  filters cannot drop anything. */}
              <Button onClick={() => handleSearch("", null)}>
                <RefreshCw aria-hidden="true" />
                Refrescar
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && rows.length > 0 && (
          <section className="flex flex-col gap-4">
            <p
              aria-live="polite"
              className="text-sm font-medium text-muted-foreground"
            >
              {rows.length === 1
                ? "Se encontró 1 pre-registro"
                : `Se encontraron ${rows.length} pre-registros`}
            </p>

            <PreRegistroTable rows={rows} onRowClick={(id) => navigate(`/consola/${id}`)} />
            <div className="flex flex-col gap-4 md:hidden">
              {rows.map((row) => (
                <PreRegistroCard
                  key={row.id}
                  row={row}
                  onClick={() => navigate(`/consola/${row.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
