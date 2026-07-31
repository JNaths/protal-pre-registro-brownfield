import { Button } from "@/components/ui/button";

type StepNavigationProps = {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  isValid: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
};

export function StepNavigation({
  currentStep,
  onNext,
  onPrev,
  isValid,
  isLastStep,
  isSubmitting = false,
}: StepNavigationProps) {
  return (
    <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-4 border-t border-border bg-card py-4 sm:static sm:mt-8 sm:border-t-0">
      <Button
        type="button"
        variant="outline"
        onClick={onPrev}
        disabled={currentStep === 0 || isSubmitting}
        className="min-h-[44px] px-6"
      >
        Atrás
      </Button>
      <Button
        type="button"
        onClick={onNext}
        disabled={!isValid || isSubmitting}
        aria-busy={isSubmitting || undefined}
        className="min-h-[44px] px-6"
      >
        {isSubmitting ? "Enviando…" : isLastStep ? "Enviar Pre-registro" : "Siguiente"}
      </Button>
    </div>
  );
}
