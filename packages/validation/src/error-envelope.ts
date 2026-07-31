import type { z } from "zod";

export type ValidationErrorEnvelope = {
  error: {
    message: string;
    fields: Record<string, string>;
  };
};

export function zodIssuesToErrorEnvelope(
  issues: z.ZodIssue[],
  defaultMessage = "Validación fallida",
): ValidationErrorEnvelope {
  const fields: Record<string, string> = {};

  for (const issue of issues) {
    const path = issue.path.join(".");
    // First-write-wins: keep only the first message seen per field path.
    if (!fields[path]) {
      fields[path] = issue.message;
    }
  }

  return {
    error: {
      message: defaultMessage,
      fields,
    },
  };
}
