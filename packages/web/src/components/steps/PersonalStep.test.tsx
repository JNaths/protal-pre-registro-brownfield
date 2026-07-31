import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { preRegistroSchema, type PreRegistro } from "@app/validation";
import { PersonalStep } from "@/components/steps/PersonalStep";

function Wrapper() {
  const form = useForm<PreRegistro>({
    resolver: zodResolver(preRegistroSchema),
    mode: "onTouched",
    // Matches usePreRegistroForm's DEFAULT_VALUES so Zod's type check doesn't fire
    // before the .min() message (RHF stores unset fields as `undefined`, not "").
    defaultValues: {
      nombre: "",
      apellidoPaterno: "",
      apellidoMaterno: "",
      fechaNacimiento: "",
      curp: "",
      rfc: "",
      email: "",
      telefono: "",
    },
  });
  return (
    <FormProvider {...form}>
      <PersonalStep />
    </FormProvider>
  );
}

describe("PersonalStep", () => {
  it('renders the "Datos personales" heading', () => {
    render(<Wrapper />);
    expect(screen.getByRole("heading", { name: "Datos personales" })).toBeInTheDocument();
  });

  it("shows the schema-sourced error when nombre is blurred empty", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const nombreInput = screen.getByLabelText("Nombre");
    await user.click(nombreInput);
    await user.tab();

    expect(await screen.findByText("Nombre requerido")).toBeInTheDocument();
  });
});
