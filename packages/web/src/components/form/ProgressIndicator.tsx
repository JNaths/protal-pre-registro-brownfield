import { Check } from "lucide-react";
import { useWizardContext } from "@/components/form/WizardContext";
import { STEP_TITLES } from "@/lib/step-schemas";
import { cn } from "@/lib/utils";

// WCAG 1.4.1 — state is never conveyed by color alone: the "Paso n de 5" text is always
// visible, and completed markers pair color with a Check icon (not color-only).
export function ProgressIndicator() {
  const { currentStep } = useWizardContext();
  const lastIndex = STEP_TITLES.length - 1;
  // Fraction of the connector track painted teal: 0 on step 1, 1 on the final step.
  const progress = lastIndex > 0 ? currentStep / lastIndex : 0;

  return (
    <div role="group" aria-label="Progreso del pre-registro" className="mb-6">
      <p className="mb-3 text-sm font-medium text-foreground">
        Paso {currentStep + 1} de {STEP_TITLES.length}
      </p>
      <div className="relative">
        {/*
          Decorative connector spanning the marker centers. With N equal-width markers,
          the first and last centers sit at 10% and 90% of the row, so the track is the
          middle 80%. The teal fill grows from the first marker to the current one as the
          user advances. aria-hidden: the visible "Paso n de N" text above is the
          accessible progress announcement (WCAG 1.4.1 — never color-only).
        */}
        <div
          aria-hidden="true"
          className="absolute left-[10%] right-[10%] top-3 h-0.5 -translate-y-1/2 rounded-full bg-border"
        />
        <div
          aria-hidden="true"
          className="absolute left-[10%] top-3 h-0.5 -translate-y-1/2 rounded-full bg-ring transition-[width] duration-300 ease-out"
          style={{ width: `calc((100% - 20%) * ${progress})` }}
        />
        <ol className="relative flex w-full items-center gap-1">
          {STEP_TITLES.map((title, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <li key={title} className="flex flex-1 flex-col items-center gap-1">
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    // bg-card keeps each marker opaque so the connector line passes
                    // behind — not through — the circle.
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    isCurrent && "border-ring bg-ring text-primary-foreground",
                    isCompleted && "border-ring bg-ring text-primary-foreground",
                    !isCurrent && !isCompleted && "border-border bg-card text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className="sr-only">{title}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
