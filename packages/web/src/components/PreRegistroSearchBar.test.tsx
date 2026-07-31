import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreRegistroSearchBar } from "@/components/PreRegistroSearchBar";

afterEach(() => {
  vi.useRealTimers();
});

describe("PreRegistroSearchBar", () => {
  it("Test 3: typing in the name input calls onSearch ONCE, 300ms after the last keystroke, with the final typed value", () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<PreRegistroSearchBar onSearch={onSearch} />);

    const nombreInput = screen.getByLabelText("Buscar por nombre");
    fireEvent.change(nombreInput, { target: { value: "A" } });
    fireEvent.change(nombreInput, { target: { value: "An" } });
    fireEvent.change(nombreInput, { target: { value: "Ana" } });

    expect(onSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("Ana", null);
  });

  it("Test 4: changing the date input (type=date) calls onSearch IMMEDIATELY (no debounce) with the date value", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<PreRegistroSearchBar onSearch={onSearch} />);

    const fechaInput = screen.getByLabelText("Fecha de envío");
    await user.type(fechaInput, "2026-07-31");

    expect(onSearch).toHaveBeenCalledWith("", "2026-07-31");
  });

  it("WR-03: picking a date within the name debounce window is not wiped by the stale name timer", () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<PreRegistroSearchBar onSearch={onSearch} />);

    // User types a name (schedules a 300ms debounced onSearch)...
    fireEvent.change(screen.getByLabelText("Buscar por nombre"), { target: { value: "Ana" } });
    // ...then, before the debounce fires, picks a date (immediate onSearch).
    fireEvent.change(screen.getByLabelText("Fecha de envío"), { target: { value: "2026-07-31" } });
    expect(onSearch).toHaveBeenLastCalledWith("Ana", "2026-07-31");

    // The still-pending name timer must fire with the LATEST fecha, not the
    // stale "" it captured when scheduled.
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenLastCalledWith("Ana", "2026-07-31");
  });

  it("Test 5: clicking 'Limpiar filtros' clears both inputs and calls onSearch('', null) immediately, cancelling any pending debounce", () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<PreRegistroSearchBar onSearch={onSearch} />);

    const nombreInput = screen.getByLabelText("Buscar por nombre");
    fireEvent.change(nombreInput, { target: { value: "Ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(onSearch).toHaveBeenCalledWith("", null);

    onSearch.mockClear();
    vi.advanceTimersByTime(300);
    expect(onSearch).not.toHaveBeenCalled();

    expect(screen.getByLabelText("Buscar por nombre")).toHaveValue("");
    expect(screen.getByLabelText("Fecha de envío")).toHaveValue("");
  });
});
