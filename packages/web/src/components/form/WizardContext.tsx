import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { STEP_TITLES } from "@/lib/step-schemas";

// D-03: wizard state lives ONLY in memory (React Context + useState). This file must
// never persist to browser storage (RS-06) — reload = start over, by design.
type WizardContextValue = {
  currentStep: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
};

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

const LAST_STEP_INDEX = STEP_TITLES.length - 1;

function clampStep(step: number): number {
  if (step < 0) return 0;
  if (step > LAST_STEP_INDEX) return LAST_STEP_INDEX;
  return step;
}

export function WizardProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);

  const value = useMemo<WizardContextValue>(
    () => ({
      currentStep,
      goToStep: (step: number) => setCurrentStep(clampStep(step)),
      nextStep: () => setCurrentStep((step) => clampStep(step + 1)),
      prevStep: () => setCurrentStep((step) => clampStep(step - 1)),
    }),
    [currentStep]
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizardContext(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizardContext must be used inside <WizardProvider>");
  }
  return ctx;
}
