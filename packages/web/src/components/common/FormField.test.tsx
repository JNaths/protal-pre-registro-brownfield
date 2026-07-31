import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "@/components/common/FormField";

describe("FormField", () => {
  it("associates its label with the child input via htmlFor/id", () => {
    render(
      <FormField name="nombre" label="Nombre">
        <input id="nombre" />
      </FormField>,
    );
    // getByLabelText resolves the label -> input association (Label htmlFor === input id).
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });

  it('appends " (opcional)" to the label when optional is set', () => {
    render(
      <FormField name="alergias" label="Alergias" optional>
        <input id="alergias" />
      </FormField>,
    );
    expect(screen.getByText("(opcional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Alergias", { exact: false })).toBeInTheDocument();
  });

  it("does not render the optional suffix by default", () => {
    render(
      <FormField name="nombre" label="Nombre">
        <input id="nombre" />
      </FormField>,
    );
    expect(screen.queryByText("(opcional)")).not.toBeInTheDocument();
  });

  it("renders the error as role=alert with id `${name}-error` (FORM-05)", () => {
    render(
      <FormField name="curp" label="CURP" error="CURP inválida">
        <input id="curp" />
      </FormField>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("CURP inválida");
    expect(alert).toHaveAttribute("id", "curp-error");
  });

  it("renders no alert when there is no error", () => {
    render(
      <FormField name="curp" label="CURP">
        <input id="curp" />
      </FormField>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
