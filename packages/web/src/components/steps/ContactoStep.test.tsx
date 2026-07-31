import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { preRegistroSchema, type PreRegistro } from "@app/validation";
import { ContactoStep } from "@/components/steps/ContactoStep";

function Wrapper() {
  const form = useForm<PreRegistro>({
    resolver: zodResolver(preRegistroSchema),
    mode: "onTouched",
    // Matches usePreRegistroForm's DEFAULT_VALUES so Zod's type check doesn't fire
    // before the field-specific message (RHF stores unset fields as `undefined`).
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
      <ContactoStep />
    </FormProvider>
  );
}

describe("ContactoStep", () => {
  it('renders the "Contacto" heading', () => {
    render(<Wrapper />);
    expect(screen.getByRole("heading", { name: "Contacto" })).toBeInTheDocument();
  });

  it("shows the schema's CURP error message when a malformed CURP is blurred", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);

    const curpInput = screen.getByLabelText("CURP");
    await user.type(curpInput, "ABC123");
    await user.tab();

    expect(
      await screen.findByText("CURP debe tener exactamente 18 caracteres")
    ).toBeInTheDocument();
  });
});
