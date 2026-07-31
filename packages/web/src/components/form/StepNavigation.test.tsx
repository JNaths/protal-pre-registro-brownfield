import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepNavigation } from "@/components/form/StepNavigation";

function renderNav(overrides: Partial<React.ComponentProps<typeof StepNavigation>> = {}) {
  const props = {
    currentStep: 1,
    totalSteps: 5,
    onNext: vi.fn(),
    onPrev: vi.fn(),
    isValid: true,
    isLastStep: false,
    ...overrides,
  };
  render(<StepNavigation {...props} />);
  return props;
}

describe("StepNavigation", () => {
  it("disables Atrás on the first step", () => {
    renderNav({ currentStep: 0 });
    expect(screen.getByRole("button", { name: "Atrás" })).toBeDisabled();
  });

  it("enables Atrás on later steps", () => {
    renderNav({ currentStep: 2 });
    expect(screen.getByRole("button", { name: "Atrás" })).toBeEnabled();
  });

  it("disables the forward button while the step is invalid (FORM-04)", () => {
    renderNav({ isValid: false });
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  });

  it("enables the forward button when the step is valid", () => {
    renderNav({ isValid: true });
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();
  });

  it('labels the forward button "Siguiente" mid-wizard', () => {
    renderNav({ isLastStep: false });
    expect(screen.getByRole("button", { name: "Siguiente" })).toBeInTheDocument();
  });

  it('labels the forward button "Enviar Pre-registro" on the last step', () => {
    renderNav({ isLastStep: true });
    expect(screen.getByRole("button", { name: "Enviar Pre-registro" })).toBeInTheDocument();
  });

  it("shows the submitting state (Enviando…, aria-busy, both buttons disabled)", () => {
    renderNav({ isLastStep: true, isSubmitting: true, currentStep: 4 });
    const submit = screen.getByRole("button", { name: "Enviando…" });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Atrás" })).toBeDisabled();
  });

  it("invokes onNext / onPrev on click", async () => {
    const user = userEvent.setup();
    const props = renderNav({ currentStep: 2 });
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(props.onNext).toHaveBeenCalledOnce();
    expect(props.onPrev).toHaveBeenCalledOnce();
  });
});
