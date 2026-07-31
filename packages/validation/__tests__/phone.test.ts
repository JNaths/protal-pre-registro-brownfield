import { describe, it, expect } from "vitest";
import { phoneSchema } from "../src/contact";

describe("phoneSchema", () => {
  it("accepts a plain 10-digit phone with no formatting", () => {
    const result = phoneSchema.safeParse("5512345678");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("5512345678");
    }
  });

  it("normalizes a dashed phone to 10 digits", () => {
    const result = phoneSchema.safeParse("55-1234-5678");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("5512345678");
    }
  });

  it("normalizes a +52-country-code-prefixed phone to the 10-digit local number", () => {
    const result = phoneSchema.safeParse("+52 55 1234 5678");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("5512345678");
    }
  });

  it("normalizes plain, dashed, and +52-prefixed input to the identical 10-digit output", () => {
    const plain = phoneSchema.safeParse("5512345678");
    const dashed = phoneSchema.safeParse("55-1234-5678");
    const prefixed = phoneSchema.safeParse("+52 55 1234 5678");
    expect(plain.success && dashed.success && prefixed.success).toBe(true);
    if (plain.success && dashed.success && prefixed.success) {
      expect(plain.data).toBe(dashed.data);
      expect(dashed.data).toBe(prefixed.data);
    }
  });

  it("rejects a 9-digit phone", () => {
    const result = phoneSchema.safeParse("123456789");
    expect(result.success).toBe(false);
  });

  it("rejects an 11-digit phone with no recognizable country-code prefix", () => {
    const result = phoneSchema.safeParse("12345678901");
    expect(result.success).toBe(false);
  });
});
