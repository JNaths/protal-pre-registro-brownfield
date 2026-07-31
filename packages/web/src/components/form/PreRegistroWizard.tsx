import { useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";
import { usePreRegistroForm } from "@/hooks/usePreRegistroForm";
import { useWizardContext, WizardProvider } from "@/components/form/WizardContext";
import { ProgressIndicator } from "@/components/form/ProgressIndicator";
import { StepNavigation } from "@/components/form/StepNavigation";
import { ErrorBanner } from "@/components/common/ErrorBanner";
import { SuccessScreen } from "@/components/common/SuccessScreen";
import { Card } from "@/components/ui/card";
import { stepSchemas, STEP_TITLES } from "@/lib/step-schemas";
import { PersonalStep } from "@/components/steps/PersonalStep";
import { ContactoStep } from "@/components/steps/ContactoStep";
import { DomicilioStep } from "@/components/steps/DomicilioStep";
import { MedicaStep } from "@/components/steps/MedicaStep";
import { ConsentimientoStep } from "@/components/steps/ConsentimientoStep";

type SuccessData = { id: number; createdAt: string };

function WizardBody() {
  const { form, isStepValid, onSubmit } = usePreRegistroForm();
  const { currentStep, nextStep, prevStep, goToStep } = useWizardContext();
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WCAG AA 2.4.3 — move focus to the new step's heading on every step change so
  // keyboard/screen-reader users land in context (FORM-08).
  useEffect(() => {
    const heading = document.querySelector(`[data-step-heading="${currentStep}"]`);
    if (heading instanceof HTMLElement) {
      heading.focus();
    }
  }, [currentStep]);

  // FORM-04: "Siguiente" stays disabled while the current step's sliced schema fails —
  // recomputed reactively from the watched form values (not RHF's whole-form isValid,
  // since later steps' required fields aren't filled yet during Personal/Contacto).
  const watchedValues = form.watch();
  const isCurrentStepValid = stepSchemas[currentStep].safeParse(watchedValues).success;
  const isLastStep = currentStep === STEP_TITLES.length - 1;

  async function handleNext() {
    if (!isLastStep) {
      if (await isStepValid(currentStep)) {
        setBannerMessage(undefined);
        nextStep();
      }
      return;
    }

    setIsSubmitting(true);
    setBannerMessage(undefined);

    await form.handleSubmit(async (data) => {
      const result = await onSubmit(data);

      if (result.success) {
        form.reset();
        goToStep(0);
        setSuccessData({ id: result.id, createdAt: result.createdAt });
      } else if ("redirectToStep" in result) {
        goToStep(result.redirectToStep);
        setBannerMessage("Hay errores en un paso anterior. Revísalos para continuar.");
      } else {
        setBannerMessage(result.error);
      }
    })();

    setIsSubmitting(false);
  }

  function handlePrev() {
    prevStep();
  }

  // FORM-06 — replaces the wizard entirely on a successful submission.
  if (successData) {
    return <SuccessScreen {...successData} />;
  }

  return (
    <FormProvider {...form}>
      <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <Card className="p-6 shadow-md sm:p-8">
          <ProgressIndicator />
          <ErrorBanner message={bannerMessage} />

          {currentStep === 0 && <PersonalStep />}
          {currentStep === 1 && <ContactoStep />}
          {currentStep === 2 && <DomicilioStep />}
          {currentStep === 3 && <MedicaStep />}
          {currentStep === 4 && <ConsentimientoStep />}

          <StepNavigation
            currentStep={currentStep}
            totalSteps={STEP_TITLES.length}
            onNext={handleNext}
            onPrev={handlePrev}
            isValid={isCurrentStepValid}
            isLastStep={isLastStep}
            isSubmitting={isSubmitting}
          />
        </Card>
      </div>
    </FormProvider>
  );
}

export function PreRegistroWizard() {
  return (
    <WizardProvider>
      <WizardBody />
    </WizardProvider>
  );
}
