import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { preRegistroSchema, type PreRegistro } from "@app/validation";
import { MedicaStep } from "@/components/steps/MedicaStep";

function Wrapper() {
  const form = useForm<PreRegistro>({
    resolver: zodResolver(preRegistroSchema),
    mode: "onTouched",
    defaultValues: {
      infoMedica: {
        tipoSangre: undefined,
        alergias: "",
        observaciones: "",
      },
    },
  });
  return (
    <FormProvider {...form}>
      <MedicaStep />
    </FormProvider>
  );
}

describe("MedicaStep", () => {
  it('renders the "Información médica" heading', () => {
    render(<Wrapper />);
    expect(screen.getByRole("heading", { name: "Información médica" })).toBeInTheDocument();
  });

  it("does not produce validation errors when all fields are left empty (DATA-05)", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByLabelText("Alergias", { exact: false }));
    await user.tab();
    await user.click(screen.getByLabelText("Observaciones", { exact: false }));
    await user.tab();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
