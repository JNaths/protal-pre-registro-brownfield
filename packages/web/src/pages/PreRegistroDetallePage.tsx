import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  FileCheck2,
  MapPin,
  Stethoscope,
  User,
} from "lucide-react";
import { EstadoBadge } from "@/components/EstadoBadge";
import { ConsoleHeader } from "@/components/ConsoleHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { PreRegistroDetalle } from "@/types/preRegistroDetalle";

const FALLBACK_ERROR_MESSAGE = "No pudimos cargar los pre-registros. Intenta de nuevo.";
const NOT_FOUND_MESSAGE = "Este pre-registro no existe o fue eliminado.";

const SEXO_LABEL: Record<PreRegistroDetalle["sexo"], string> = {
  H: "Hombre",
  M: "Mujer",
  X: "X",
};

function formatFechaLarga(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFechaNacimiento(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** A card with an identifiable, icon-led header separated from its body. */
function SectionCard({
  icon,
  title,
  accent,
  children,
}: {
  icon: ReactNode;
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl border-border/70 shadow-sm">
      <div className="flex items-center gap-3 border-b border-border/70 bg-muted/40 px-5 py-3.5">
        <span
          aria-hidden="true"
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", accent)}
        >
          {icon}
        </span>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      <CardContent className="px-5 py-4">{children}</CardContent>
    </Card>
  );
}

/** A label/value row rendered inside a section's definition list. */
function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-right text-sm font-medium text-foreground",
          mono && "font-mono"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function DetalleSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Cargando…</span>
      <div className="h-28 animate-pulse rounded-2xl border border-border/70 bg-card" />
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl border border-border/70 bg-card" />
        ))}
      </div>
    </div>
  );
}

export default function PreRegistroDetallePage() {
  const { id } = useParams<{ id: string }>();

  const [preRegistro, setPreRegistro] = useState<PreRegistroDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDetalle() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const res = await fetch(`/api/consola/pre-registros/${id}`, {
          credentials: "include",
        });
        if (cancelled) return;

        if (res.ok) {
          const body = await res.json();
          setPreRegistro(body.data);
        } else if (res.status === 404) {
          setNotFound(true);
        } else {
          const data = await res.json().catch(() => null);
          setError(data?.error?.message ?? FALLBACK_ERROR_MESSAGE);
        }
      } catch {
        if (cancelled) return;
        setError(FALLBACK_ERROR_MESSAGE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDetalle();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleValidate() {
    setValidating(true);
    try {
      const res = await fetch(`/api/consola/pre-registros/${id}/validar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (res.ok) {
        const { data } = await res.json();
        setPreRegistro(data);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? FALLBACK_ERROR_MESSAGE);
      }
    } catch {
      setError(FALLBACK_ERROR_MESSAGE);
    } finally {
      setShowConfirm(false);
      setValidating(false);
    }
  }

  const patientInitial =
    preRegistro?.nombre?.trim().charAt(0).toUpperCase() || "";

  return (
    <div className="min-h-screen bg-background">
      <ConsoleHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <Button asChild variant="outline" size="lg" className="w-fit gap-2 px-4">
          <Link to="/consola" aria-label="Volver a la lista de pre-registros">
            <ArrowLeft aria-hidden="true" />
            Volver a la lista
          </Link>
        </Button>

        {loading && <DetalleSkeleton />}

        {notFound && (
          <Card className="mx-auto max-w-md rounded-2xl border-border/70 shadow-sm">
            <CardContent className="p-8 text-center text-muted-foreground">
              {NOT_FOUND_MESSAGE}
            </CardContent>
          </Card>
        )}

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive-text"
          >
            {error}
          </div>
        )}

        {preRegistro && (
          <>
            {/* Hero summary — patient identity, folio, estado, and the primary action. */}
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-xl font-semibold text-white shadow-sm"
                  >
                    {patientInitial}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      Pre-registro #{id}
                    </p>
                    <h1 className="truncate text-2xl font-semibold tracking-tight">
                      {preRegistro.nombre} {preRegistro.apellidoPaterno}{" "}
                      {preRegistro.apellidoMaterno}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <EstadoBadge
                        validado={preRegistro.validado}
                        validadoEn={preRegistro.validadoEn}
                      />
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        Enviado el {formatFechaLarga(preRegistro.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  aria-label={
                    preRegistro.validado
                      ? undefined
                      : `Validar y confirmar el pre-registro del paciente ${preRegistro.nombre} ${preRegistro.apellidoPaterno} ${preRegistro.apellidoMaterno}`
                  }
                  disabled={preRegistro.validado || validating}
                  onClick={() => setShowConfirm(true)}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {preRegistro.validado ? "Validado" : "Validar y Confirmar"}
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <SectionCard
                icon={<User className="size-5" />}
                title="Datos Personales"
                accent="bg-brand-100 text-brand-700"
              >
                <dl>
                  <Field
                    label="Nombre completo"
                    value={`${preRegistro.nombre} ${preRegistro.apellidoPaterno} ${preRegistro.apellidoMaterno}`}
                  />
                  <Field label="CURP" value={preRegistro.curp} mono />
                  <Field
                    label="Fecha de nacimiento"
                    value={formatFechaNacimiento(preRegistro.fechaNacimiento)}
                  />
                  <Field label="Sexo" value={SEXO_LABEL[preRegistro.sexo]} />
                  {preRegistro.rfc && <Field label="RFC" value={preRegistro.rfc} mono />}
                  <Field label="Teléfono" value={preRegistro.telefono} />
                  <Field label="Correo Electrónico" value={preRegistro.email} />
                </dl>
              </SectionCard>

              <SectionCard
                icon={<MapPin className="size-5" />}
                title="Domicilio"
                accent="bg-sky-100 text-sky-700"
              >
                {preRegistro.domicilio ? (
                  <dl>
                    <Field
                      label="Calle y número"
                      value={`${preRegistro.domicilio.calle} ${preRegistro.domicilio.numero}`}
                    />
                    <Field label="Colonia" value={preRegistro.domicilio.colonia} />
                    <Field label="Código Postal" value={preRegistro.domicilio.codigoPostal} />
                    <Field label="Municipio" value={preRegistro.domicilio.municipio} />
                    <Field label="Estado" value={preRegistro.domicilio.estado} />
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No especificado</p>
                )}
              </SectionCard>

              <SectionCard
                icon={<Stethoscope className="size-5" />}
                title="Información Médica"
                accent="bg-rose-100 text-rose-700"
              >
                <dl>
                  <Field
                    label="Tipo de Sangre"
                    value={preRegistro.infoMedica?.tipoSangre ?? "No especificado"}
                  />
                  <Field
                    label="Alergias"
                    value={preRegistro.infoMedica?.alergias ?? "No especificado"}
                  />
                  <Field
                    label="Observaciones"
                    value={preRegistro.infoMedica?.observaciones ?? "No especificado"}
                  />
                </dl>
              </SectionCard>

              {preRegistro.consentimiento && (
                <SectionCard
                  icon={<FileCheck2 className="size-5" />}
                  title="Constancia de Consentimiento"
                  accent="bg-emerald-100 text-emerald-700"
                >
                  <dl>
                    <Field
                      label="Aceptado el"
                      value={formatFechaLarga(preRegistro.consentimiento.fechaAceptacion)}
                    />
                  </dl>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Esta información no puede ser modificada
                  </p>
                </SectionCard>
              )}
            </div>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar validación</AlertDialogTitle>
                  <AlertDialogDescription>
                    {`¿Estás seguro de que quieres validar este pre-registro? Esto marcará al paciente ${preRegistro.nombre} como presente y confirmará su registro. Esta acción no se puede deshacer.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleValidate}>Sí, validar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </main>
    </div>
  );
}
