import { Writable } from "node:stream";
import pino from "pino";

// PII fields to redact. curp/rfc/nombre/apellidos/email/telefono exist on
// PreRegistro today (Phase 1 schema); domicilio/alergias/observaciones do
// NOT exist yet (DATA-04/DATA-05, deferred to Phase 3) but are included
// here anyway — redacting a key that never appears is harmless and keeps
// this logger forward-compatible once those columns land (D-09).
const REDACT_PATHS = [
  "curp",
  "rfc",
  "nombre",
  "apellidoPaterno",
  "apellidoMaterno",
  "email",
  "telefono",
  "domicilio",
  "alergias",
  "observaciones",
];

// Factory: accepts an optional pino.DestinationStream so tests can capture
// output in-memory instead of writing to real process.stdout.
export function createLogger(destination?: pino.DestinationStream) {
  const options: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || "info",
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
    serializers: {
      req(request: { method: string; url: string }) {
        // Never include request.body — Pitfall 1 (02-RESEARCH.md).
        return {
          method: request.method,
          url: request.url,
        };
      },
      res(response: { statusCode: number }) {
        // Never include response.body.
        return {
          statusCode: response.statusCode,
        };
      },
    },
  };

  return destination ? pino(options, destination) : pino(options);
}

// The singleton logger (and every child derived from it) binds its pino sink
// at import time. To let tests capture what the route actually logs — without
// the vacuous "patch process.stdout.write after the fact" approach (WR-02) —
// the singleton writes through a stable routing destination that forwards to a
// swappable sink. Production always forwards to process.stdout; tests redirect
// the sink to an in-memory stream and get the real, redacted log output.
let activeSink: NodeJS.WritableStream = process.stdout;

const routingDestination = new Writable({
  write(chunk, _encoding, callback) {
    activeSink.write(chunk);
    callback();
  },
});

// Redirect the singleton logger's output to a test-provided stream. Returns
// nothing; call resetLoggerSink() (typically in a finally block) to restore.
export function setLoggerSink(sink: NodeJS.WritableStream): void {
  activeSink = sink;
}

export function resetLoggerSink(): void {
  activeSink = process.stdout;
}

// Singleton for route usage — writes through the swappable routing destination
// (default: process.stdout).
export const logger = createLogger(routingDestination);
