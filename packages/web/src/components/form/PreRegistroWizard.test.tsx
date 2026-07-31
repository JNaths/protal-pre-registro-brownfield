import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreRegistroWizard } from "@/components/form/PreRegistroWizard";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

// Fills all 5 steps with schema-valid data, leaving the user on Consentimiento
// with the consent checkbox still unchecked (mirrors ConsentimientoStep.test.tsx's
// goToConsentimiento helper).
async function fillAllStepsToConsentimiento(user: ReturnType<typeof userEvent.setup>) {
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
  await user.type(screen.getByLabelText("CURP"), "MOTR930411HJCRMN11");
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
  await user.click(screen.getByRole("checkbox", { name: "Acepto el aviso de privacidad" }));
}

describe("PreRegistroWizard", () => {
  it("submits a complete valid pre-registro and shows the success screen with folio (FORM-06)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: "Registro creado",
        id: 42,
        createdAt: "2026-07-17T00:00:00.000Z",
      }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    await fillAllStepsToConsentimiento(user);

    await user.click(screen.getByRole("button", { name: "Enviar Pre-registro" }));

    const heading = await screen.findByRole("heading", {
      name: "¡Pre-registro enviado exitosamente!",
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it("maps a cross-step 422 error back to its field and navigates back to that step", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: {
          message: "Validación fallida",
          fields: {
            "domicilio.codigoPostal": "Código postal debe ser 5 dígitos",
          },
        },
      }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    await fillAllStepsToConsentimiento(user);

    await user.click(screen.getByRole("button", { name: "Enviar Pre-registro" }));

    const domicilioHeading = await screen.findByRole("heading", { name: "Domicilio" });
    expect(domicilioHeading).toBeInTheDocument();
    expect(
      screen.getByText("Hay errores en un paso anterior. Revísalos para continuar.")
    ).toBeInTheDocument();
    expect(screen.getByText("Código postal debe ser 5 dígitos")).toBeInTheDocument();
  });

  it("never writes to localStorage/sessionStorage, including after a successful submission (RS-06)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: "Registro creado",
        id: 7,
        createdAt: "2026-07-17T00:00:00.000Z",
      }),
    }) as unknown as typeof fetch;

    const localSetItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const user = userEvent.setup();
    await fillAllStepsToConsentimiento(user);
    await user.click(screen.getByRole("button", { name: "Enviar Pre-registro" }));

    await screen.findByRole("heading", { name: "¡Pre-registro enviado exitosamente!" });

    expect(localSetItemSpy).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('shows "Paso 1 de 5" on mount (FORM-01, FORM-02)', () => {
    render(<PreRegistroWizard />);
    expect(screen.getByText("Paso 1 de 5")).toBeInTheDocument();
  });

  it("does not advance when clicking Siguiente with nombre empty (FORM-04)", async () => {
    const user = userEvent.setup();
    render(<PreRegistroWizard />);

    const nextButton = screen.getByRole("button", { name: "Siguiente" });
    await user.click(nextButton);

    expect(screen.getByRole("heading", { name: "Datos personales" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Contacto" })).not.toBeInTheDocument();
  });

  it("advances to Contacto and moves focus to its heading once Personal step is valid (FORM-08)", async () => {
    const user = userEvent.setup();
    render(<PreRegistroWizard />);

    await user.type(screen.getByLabelText("Nombre"), "Juan");
    await user.type(screen.getByLabelText("Apellido paterno"), "Pérez");
    await user.type(screen.getByLabelText("Apellido materno"), "García");
    await user.type(screen.getByLabelText("Fecha de nacimiento"), "1990-05-15");
    await user.click(screen.getByLabelText("Hombre"));

    const nextButton = screen.getByRole("button", { name: "Siguiente" });
    await user.click(nextButton);

    const contactoHeading = await screen.findByRole("heading", { name: "Contacto" });
    expect(contactoHeading).toBeInTheDocument();
    expect(contactoHeading).toHaveFocus();
  });
});
