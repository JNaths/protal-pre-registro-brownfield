import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "./hash";

describe("hashPassword / comparePassword (D-04: bcryptjs cost 12)", () => {
  it("hashPassword returns a bcrypt hash distinct from the plaintext", async () => {
    const hash = await hashPassword("Secreta123!");
    expect(hash.startsWith("$2")).toBe(true);
    expect(hash).not.toBe("Secreta123!");
  });

  it("comparePassword resolves true for the correct plaintext/hash pair", async () => {
    const hash = await hashPassword("Secreta123!");
    await expect(comparePassword("Secreta123!", hash)).resolves.toBe(true);
  });

  it("comparePassword resolves false for an incorrect plaintext", async () => {
    const hash = await hashPassword("Secreta123!");
    await expect(comparePassword("Incorrecta", hash)).resolves.toBe(false);
  });
});
