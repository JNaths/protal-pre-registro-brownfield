import { describe, it, expect } from "vitest";
import { rfcSchema } from "../src/rfc";

// Fixture confirmed valid via direct `validateRfc()` invocation during implementation.
describe("rfcSchema", () => {
  it("accepts a confirmed-valid 13-char persona-física RFC", () => {
    const result = rfcSchema.safeParse("MHTR93041179A");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("MHTR93041179A");
    }
  });

  it("accepts undefined (VALID-02: RFC is optional)", () => {
    const result = rfcSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("accepts an empty string (VALID-02: RFC is optional)", () => {
    const result = rfcSchema.safeParse("");
    expect(result.success).toBe(true);
  });

  it("rejects a malformed RFC with a bad homoclave/check digit", () => {
    const result = rfcSchema.safeParse("MHTR93041179Z");
    expect(result.success).toBe(false);
  });

  it("rejects a malformed RFC with the wrong length", () => {
    const result = rfcSchema.safeParse("MHTR930411");
    expect(result.success).toBe(false);
  });
});
