import { describe, it, expect } from "vitest";
import { MEXICAN_STATES, estadoSchema } from "../src/estados";

describe("MEXICAN_STATES", () => {
  it("lists exactly the 32 Mexican federal entities", () => {
    // Arrange / Act / Assert — the dropdown (frontend) and the enum (backend) both
    // source this list, so its cardinality is a contract, not an implementation detail.
    expect(MEXICAN_STATES).toHaveLength(32);
  });

  it("has no duplicate entries", () => {
    expect(new Set(MEXICAN_STATES).size).toBe(MEXICAN_STATES.length);
  });
});

describe("estadoSchema", () => {
  it.each(MEXICAN_STATES)("accepts the valid state %s", (state) => {
    const result = estadoSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it('rejects an unknown state with the "Estado inválido" message', () => {
    const result = estadoSchema.safeParse("California");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Estado inválido");
    }
  });

  it("rejects an empty string", () => {
    expect(estadoSchema.safeParse("").success).toBe(false);
  });

  it("rejects a valid state name in the wrong case (enum is case-sensitive)", () => {
    expect(estadoSchema.safeParse("ciudad de méxico").success).toBe(false);
  });

  it("rejects a non-string value", () => {
    expect(estadoSchema.safeParse(7).success).toBe(false);
  });
});
