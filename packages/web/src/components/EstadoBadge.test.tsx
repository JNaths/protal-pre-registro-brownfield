import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EstadoBadge } from "@/components/EstadoBadge";

describe("EstadoBadge", () => {
  it("Test 1: validado=false renders 'Pendiente de validación' with aria-label 'Estado: pendiente de validación'", () => {
    render(<EstadoBadge validado={false} />);
    const badge = screen.getByText("Pendiente de validación");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("aria-label", "Estado: pendiente de validación");
  });

  it("Test 2: validado=true renders 'Validado' with an aria-label starting with 'Estado: validado'", () => {
    render(<EstadoBadge validado={true} validadoEn="2026-07-31T14:32:00.000Z" />);
    const badge = screen.getByText("Validado");
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute("aria-label")).toMatch(/^Estado: validado/);
  });
});
