import { Writable } from "node:stream";
import { describe, it, expect } from "vitest";
import { createLogger } from "./logger";

function captureStream() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return { stream, chunks };
}

describe("createLogger", () => {
  it("redacts curp and keeps non-PII fields intact", () => {
    const { stream, chunks } = captureStream();
    const log = createLogger(stream);

    log.info({ curp: "MOTR930411HJCRMN03", safe: "ok" });

    const output = chunks.join("");
    expect(output).not.toContain("MOTR930411HJCRMN03");
    expect(output).toContain('"safe":"ok"');
  });

  it("redacts nombre, apellidoPaterno, email, and telefono", () => {
    const { stream, chunks } = captureStream();
    const log = createLogger(stream);

    log.info({
      nombre: "Juan",
      apellidoPaterno: "Pérez",
      email: "a@b.com",
      telefono: "5512345678",
    });

    const output = chunks.join("");
    expect(output).not.toContain("Juan");
    expect(output).not.toContain("Pérez");
    expect(output).not.toContain("a@b.com");
    expect(output).not.toContain("5512345678");
  });
});
