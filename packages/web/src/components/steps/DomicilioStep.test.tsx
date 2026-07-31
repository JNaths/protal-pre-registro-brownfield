import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { preRegistroSchema, MEXICAN_STATES, type PreRegistro } from "@app/validation";
import { DomicilioStep } from "@/components/steps/DomicilioStep";

function Wrapper() {
  const form = useForm<PreRegistro>({
    resolver: zodResolver(preRegistroSchema),
    mode: "onTouched",
    defaultValues: {
      domicilio: {
        calle: "",
        numero: "",
        colonia: "",
        codigoPostal: "",
        estado: undefined,
        municipio: "",
      },
    },
  });
  return (
    <FormProvider {...form}>
      <DomicilioStep />
    </FormProvider>
  );
}

describe("DomicilioStep", () => {
  it('renders the "Domicilio" heading', () => {
    render(<Wrapper />);
    expect(screen.getByRole("heading", { name: "Domicilio" })).toBeInTheDocument();
  });

  it("shows the schema's codigoPostal error message when blurred with an invalid value", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const cpInput = screen.getByLabelText("Código postal");
    await user.type(cpInput, "ABC12");
    await user.tab();

    expect(await screen.findByText("Código postal debe ser 5 dígitos")).toBeInTheDocument();
  });

  it("renders the estado Select populated with all 32 Mexican states", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    await user.click(screen.getByLabelText("Estado"));

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(MEXICAN_STATES.length);
    expect(screen.getByRole("option", { name: "Ciudad de México" })).toBeInTheDocument();
  });
});
