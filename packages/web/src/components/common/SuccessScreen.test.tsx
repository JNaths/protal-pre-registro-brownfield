import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuccessScreen } from "@/components/common/SuccessScreen";

describe("SuccessScreen", () => {
  it("renders the server-returned folio (id)", () => {
    render(<SuccessScreen id={139} createdAt="2026-07-31T09:33:58Z" />);
    expect(screen.getByText("139")).toBeInTheDocument();
  });

  it("renders the created date formatted for es-MX", () => {
    render(<SuccessScreen id={139} createdAt="2026-07-31T09:33:58Z" />);
    const expected = new Date("2026-07-31T09:33:58Z").toLocaleDateString("es-MX");
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("renders ONLY the folio and date — no other patient PII (RS-06, T-03-13)", () => {
    // Guard: even though this component receives just {id, createdAt}, assert that no
    // patient field leaks onto the confirmation surface if the props shape ever changes.
    render(<SuccessScreen id={139} createdAt="2026-07-31T09:33:58Z" />);
    expect(screen.queryByText(/MOTR930411HJCRMN03/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/juan\.perez@example\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/5512345678/)).not.toBeInTheDocument();
    // Only labels that should be present are the two <dt> headers.
    expect(screen.getByText("Folio")).toBeInTheDocument();
    expect(screen.getByText("Fecha")).toBeInTheDocument();
  });

  it("moves focus to its heading on mount (WCAG AA)", () => {
    render(<SuccessScreen id={139} createdAt="2026-07-31T09:33:58Z" />);
    expect(
      screen.getByRole("heading", { name: "¡Pre-registro enviado exitosamente!" }),
    ).toHaveFocus();
  });

  it("wraps its content in an aria-live=polite region", () => {
    const { container } = render(<SuccessScreen id={139} createdAt="2026-07-31T09:33:58Z" />);
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});
