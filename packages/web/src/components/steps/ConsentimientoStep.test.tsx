import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreRegistroWizard } from "@/components/form/PreRegistroWizard";

async function goToConsentimiento(user: ReturnType<typeof userEvent.setup>) {
  render(<PreRegistroWizard />);

  // Step 1: Datos personales
  await user.type(screen.getByLabelText("Nombre"), "Juan");
  await user.type(screen.getByLabelText("Apellido paterno"), "Pérez");
  await user.type(screen.getByLabelText("Apellido materno"), "García");
  await user.type(screen.getByLabelText("Fecha de nacimiento"), "1993-04-11");
  await user.click(screen.getByLabelText("Hombre"));
  await user.click(screen.getByRole("button", { name: "Siguiente" }));

  // Step 2: Contacto
  await screen.findByRole("heading", { name: "Contacto" });
  await user.type(screen.getByLabelText("CURP"), "MOTR930411HJCRMN03");
  await user.type(screen.getByLabelText("Correo electrónico"), "juan.perez@example.com");
  await user.type(screen.getByLabelText("Teléfono"), "5512345678");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));

  // Step 3: Domicilio
  await screen.findByRole("heading", { name: "Domicilio" });
  await user.type(screen.getByLabelText("Calle"), "Calle Falsa");
  await user.type(screen.getByLabelText("Número"), "123");
  await user.type(screen.getByLabelText("Colonia"), "Centro");
  await user.type(screen.getByLabelText("Código postal"), "28001");
  await user.click(screen.getByLabelText("Estado"));
  await user.click(await screen.findByRole("option", { name: "Ciudad de México" }));
  await user.type(screen.getByLabelText("Municipio"), "Benito Juárez");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));

  // Step 4: Información médica (all optional, just advance)
  await screen.findByRole("heading", { name: "Información médica" });
  await user.click(screen.getByRole("button", { name: "Siguiente" }));

  // Step 5: Consentimiento
  await screen.findByRole("heading", { name: "Consentimiento" });
}

describe("ConsentimientoStep", () => {
  it('shows "Enviar Pre-registro" disabled while consent is unchecked (DATA-06)', async () => {
    const user = userEvent.setup();
    await goToConsentimiento(user);

    const submitButton = screen.getByRole("button", { name: "Enviar Pre-registro" });
    expect(submitButton).toBeDisabled();
  });

  it("enables the submit button once the consent checkbox is checked (DATA-06, FORM-04)", async () => {
    const user = userEvent.setup();
    await goToConsentimiento(user);

    const checkbox = screen.getByRole("checkbox", { name: "Acepto el aviso de privacidad" });
    await user.click(checkbox);

    const submitButton = screen.getByRole("button", { name: "Enviar Pre-registro" });
    expect(submitButton).toBeEnabled();
  });
});
