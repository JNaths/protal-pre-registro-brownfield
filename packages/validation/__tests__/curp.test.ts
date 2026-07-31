import { describe, it, expect } from "vitest";
import { curpSchema } from "../src/curp";

// Fixtures confirmed valid/invalid via direct `validateCurp()` invocation during
// implementation (see 01-03-SUMMARY.md "Deviations" for the X-sex fixture note).
describe("curpSchema", () => {
  it("accepts a confirmed-valid CURP with sex char H", () => {
    const result = curpSchema.safeParse("MOTR930411HJCRMN03");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("MOTR930411HJCRMN03");
    }
  });

  it("rejects the same CURP with the check digit altered", () => {
    const result = curpSchema.safeParse("MOTR930411HJCRMN09");
    expect(result.success).toBe(false);
  });

  it("accepts a confirmed-valid CURP with sex char M (proves H is not hardcoded)", () => {
    const result = curpSchema.safeParse("MOTR930411MJCRMN03");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("MOTR930411MJCRMN03");
    }
  });

  it("accepts a confirmed-valid CURP with sex char X (D-06: modern non-binary support)", () => {
    const result = curpSchema.safeParse("MOTR930411XJCRMN07");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("MOTR930411XJCRMN07");
    }
  });

  it("rejects a CURP that is too short", () => {
    const result = curpSchema.safeParse("MOTR930411H");
    expect(result.success).toBe(false);
  });

  it("rejects a CURP that is too long", () => {
    const result = curpSchema.safeParse("MOTR930411HJCRMN03XX");
    expect(result.success).toBe(false);
  });

  it("rejects a CURP with an invalid entidad federativa code (checksum otherwise valid)", () => {
    const result = curpSchema.safeParse("MOTR930411HXXRMN06");
    expect(result.success).toBe(false);
  });

  // CR-01 regression: the X-sex fallback must interpret the birth century from the
  // homoclave differentiator (index 16: digit → 1900s, letter → 2000s), NOT assume
  // 20YY, and must reject impossible calendar dates via strict reconstruction.
  it("rejects an X-sex CURP with an impossible calendar date (Feb 31)", () => {
    // 930231 = Feb 31, 1993 — never a real date; strict reconstruction must reject.
    const result = curpSchema.safeParse("MOTR930231XJCRMN07");
    expect(result.success).toBe(false);
  });

  it("still accepts the valid 1993 X-sex CURP (digit differentiator → 1900s, not 2093)", () => {
    // Differentiator at index 16 is "0" (a digit) → 1993, the correct birth year.
    const result = curpSchema.safeParse("MOTR930411XJCRMN07");
    expect(result.success).toBe(true);
  });
});
