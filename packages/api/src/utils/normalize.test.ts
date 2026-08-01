import { describe, it, expect } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("strips accents", () => {
    expect(normalize("José")).toBe("jose");
  });

  it("lowercases and strips accents", () => {
    expect(normalize("PEÑA")).toBe("pena");
  });

  it("trims leading/trailing whitespace without collapsing internal spaces", () => {
    expect(normalize("  María José  ")).toBe("maria jose");
  });

  it("returns an empty string for empty input", () => {
    expect(normalize("")).toBe("");
  });
});
