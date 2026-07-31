import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoBadge } from "@/components/EstadoBadge";
import type { PreRegistroRow } from "@/types/preRegistro";

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PreRegistroCard({
  row,
  onClick,
}: {
  row: PreRegistroRow;
  onClick: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Ver detalle de ${row.nombre} ${row.apellidoPaterno} ${row.apellidoMaterno}`}
      className="cursor-pointer rounded-2xl border-border/70 transition-all hover:border-brand-200 hover:shadow-md active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="truncate font-semibold text-foreground">
            {row.nombre} {row.apellidoPaterno} {row.apellidoMaterno}
          </p>
          <p className="font-mono text-sm text-muted-foreground">{row.curp}</p>
          <p className="text-sm text-muted-foreground">{formatFecha(row.createdAt)}</p>
          <div className="pt-0.5">
            <EstadoBadge validado={row.validado} validadoEn={row.validadoEn} />
          </div>
        </div>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </CardContent>
    </Card>
  );
}
