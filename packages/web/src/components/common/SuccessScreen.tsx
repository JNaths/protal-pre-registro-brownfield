import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

type SuccessScreenProps = {
  id: number;
  createdAt: string;
};

// FORM-06: replaces the wizard on a successful POST /api/pre-registros. Renders ONLY
// the folio (id) and formatted createdAt returned by the server — no other patient
// field is ever displayed here (RS-06, T-03-13).
export function SuccessScreen({ id, createdAt }: SuccessScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // WCAG AA — focus moves to the heading on mount so keyboard/SR users land in context.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const formattedDate = new Date(createdAt).toLocaleDateString("es-MX");

  return (
    <div aria-live="polite" className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <Card className="flex flex-col items-center gap-5 p-8 text-center shadow-md">
        <span className="flex size-16 items-center justify-center rounded-full bg-ring/10">
          <CheckCircle2 className="size-10 text-ring" aria-hidden="true" />
        </span>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-foreground focus:outline-none"
        >
          ¡Pre-registro enviado exitosamente!
        </h2>
        <p className="text-base text-muted-foreground">
          Tu pre-registro fue confirmado. Preséntalo en recepción al llegar.
        </p>

        {/*
          Folio + fecha get the strongest visual weight on this screen: the folio is what
          the patient reads out at the reception desk. The 1px gap over a bg-border track
          renders a hairline divider between the two cells.
        */}
        <dl className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
          <div className="flex flex-col items-center gap-1 bg-card px-4 py-5">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Folio
            </dt>
            <dd className="text-3xl font-bold leading-none text-primary">{id}</dd>
          </div>
          <div className="flex flex-col items-center gap-1 bg-card px-4 py-5">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fecha
            </dt>
            <dd className="text-lg font-semibold leading-none text-foreground">{formattedDate}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
