import { HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  /** Hides the wordmark, leaving only the icon tile (e.g. compact app bars). */
  iconOnly?: boolean;
  /** Overall scale. `sm` suits app bars; `md` suits page headers. */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Shared product identity used across the public patient surfaces and the
 * authenticated console, so the whole portal reads as one branded product.
 * Decorative — the icon is aria-hidden and the wordmark is plain text.
 */
export function BrandMark({ iconOnly = false, size = "md", className }: BrandMarkProps) {
  const tile = size === "sm" ? "size-9 rounded-xl" : "size-11 rounded-2xl";
  const icon = size === "sm" ? "size-5" : "size-6";
  const title = size === "sm" ? "text-base" : "text-lg";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm ring-1 ring-brand-900/10",
          tile
        )}
      >
        <HeartPulse className={icon} strokeWidth={2.25} />
      </span>
      {!iconOnly && (
        <span className="flex flex-col leading-tight">
          <span className={cn("font-semibold tracking-tight text-foreground", title)}>
            Portal de Pacientes
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Pre-registro médico
          </span>
        </span>
      )}
    </div>
  );
}
