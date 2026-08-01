import { Badge } from "@/components/ui/badge";

function formatFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function EstadoBadge({
  validado,
  validadoEn,
}: {
  validado: boolean;
  validadoEn?: string | null;
}) {
  if (validado) {
    return (
      <Badge
        role="status"
        aria-label={`Estado: validado${validadoEn ? ` el ${formatFechaCorta(validadoEn)}` : ""}`}
        className="bg-[#0D9488] text-white"
      >
        Validado
      </Badge>
    );
  }

  return (
    <Badge
      role="status"
      aria-label="Estado: pendiente de validación"
      variant="secondary"
      className="bg-[#F3F4F6] text-[#111827]"
    >
      Pendiente de validación
    </Badge>
  );
}
