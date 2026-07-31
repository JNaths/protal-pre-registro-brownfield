import { describe, it, expect } from "vitest";
import { emailSchema } from "../src/contact";

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    const result = emailSchema.safeParse("paciente@example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("paciente@example.com");
    }
  });

  it("rejects a malformed email (no @, no domain)", () => {
    const result = emailSchema.safeParse("no-es-un-correo");
    expect(result.success).toBe(false);
  });

  it("normalizes case and trims surrounding whitespace", () => {
    const result = emailSchema.safeParse("  Paciente@Example.COM  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("paciente@example.com");
    }
  });
});
