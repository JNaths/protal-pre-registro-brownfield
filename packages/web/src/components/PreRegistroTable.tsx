import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstadoBadge } from "@/components/EstadoBadge";
import type { PreRegistroRow } from "@/types/preRegistro";

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PreRegistroTable({
  rows,
  onRowClick,
}: {
  rows: PreRegistroRow[];
  onRowClick: (id: number) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm md:block">
      <Table aria-label="Lista de pre-registros">
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="h-11 px-4">Nombre Completo</TableHead>
            <TableHead scope="col" className="h-11 px-4">CURP</TableHead>
            <TableHead scope="col" className="h-11 px-4">Fecha de Envío</TableHead>
            <TableHead scope="col" className="h-11 px-4">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            // WR-05: the <tr> keeps its native `row` role so table semantics
            // (row/column association, scope="col" header mapping) stay intact
            // for assistive tech (WCAG 1.3.1). The interactive affordance lives
            // in a real <button> inside the first cell, which carries the
            // aria-label and keyboard handling. onClick on the row is a
            // mouse-only convenience; the button's own handler stops propagation
            // to avoid a double navigation.
            <TableRow
              key={row.id}
              onClick={() => onRowClick(row.id)}
              className="cursor-pointer hover:bg-muted"
            >
              <TableCell className="max-w-[220px] truncate px-4 py-3 font-medium">
                <button
                  type="button"
                  aria-label={`Ver detalle de ${row.nombre} ${row.apellidoPaterno} ${row.apellidoMaterno}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(row.id);
                  }}
                  className="w-full truncate text-left hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {row.nombre} {row.apellidoPaterno} {row.apellidoMaterno}
                </button>
              </TableCell>
              <TableCell className="px-4 py-3 font-mono text-muted-foreground">{row.curp}</TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">{formatFecha(row.createdAt)}</TableCell>
              <TableCell className="px-4 py-3">
                <EstadoBadge validado={row.validado} validadoEn={row.validadoEn} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
