import { describe, it, expect } from "vitest";
import { sanitizeField } from "./sanitize";

describe("sanitizeField", () => {
  it("strips a <script> tag while preserving accents and ñ", () => {
    const result = sanitizeField("María José <script>alert(1)</script>");
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("</script>");
    expect(result).toContain("María José");
  });

  it("preserves apostrophe and ñ in a name with a hyphen", () => {
    const result = sanitizeField("O'Connor-Núñez");
    expect(result).toContain("O'Connor");
    expect(result).toContain("Núñez");
  });

  it("strips <b> tags and returns plain text content", () => {
    const result = sanitizeField("<b>bold</b> text");
    expect(result).not.toContain("<b>");
    expect(result).not.toContain("</b>");
    expect(result).toBe("bold text");
  });

  // WR-01: sanitize-html HTML-entity-encodes surviving text, corrupting
  // free-text names/addresses. sanitizeField must decode those entities so
  // plain text is stored intact.
  it("preserves a literal ampersand instead of encoding it as &amp;", () => {
    expect(sanitizeField("Juan & Ana")).toBe("Juan & Ana");
    expect(sanitizeField("Calle 5 & 3")).toBe("Calle 5 & 3");
  });

  it("still strips <script> content and yields plain text (no encoding)", () => {
    const result = sanitizeField("<script>alert(1)</script>Ana");
    expect(result).not.toContain("<script>");
    expect(result).toBe("Ana");
  });

  it("preserves accents, ñ, and apostrophes verbatim", () => {
    expect(sanitizeField("O'Connor-Núñez")).toBe("O'Connor-Núñez");
    expect(sanitizeField("María José")).toBe("María José");
  });

  // XSS regression: tags are stripped BEFORE decoding, so a decoded "<"/">"
  // from literal text can never reconstruct an executable tag.
  it("does not reconstruct an executable tag from a stripped attribute payload", () => {
    const result = sanitizeField("<img src=x onerror=alert(1)>");
    expect(result).not.toContain("<img");
    expect(result).not.toContain("onerror");
  });
});
