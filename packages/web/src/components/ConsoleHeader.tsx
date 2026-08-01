import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/common/BrandMark";

/**
 * Sticky app bar shared by every authenticated console surface (list + detail) so
 * the reception staff always have consistent product chrome and a logout affordance.
 */
export function ConsoleHeader() {
  const { staff, logout } = useAuth();

  const staffName = staff?.nombre ?? staff?.email ?? "";
  const staffInitial = staffName.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandMark size="sm" />
        <div className="flex items-center gap-2 sm:gap-3">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800"
          >
            {staffInitial}
          </span>
          <span className="hidden text-sm font-medium text-foreground sm:inline">
            {staffName}
          </span>
          <Button variant="ghost" onClick={() => logout()}>
            <LogOut aria-hidden="true" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </header>
  );
}
