import { z } from "zod";
import validateRfc from "validate-rfc";

// RFC has no sex character (unlike CURP), so the H/M/X library-limitation that affects
// curp.ts does not apply here — validate-rfc fully covers this field's checksum logic.
export const rfcSchema = z
  .string()
  .optional()
  .refine(
    (rfc) => {
      if (!rfc) return true; // VALID-02: RFC is optional
      // Phase 1 default per 01-RESEARCH.md Pitfall 5: strict mode (do not globally omit
      // the verification digit check).
      const result = validateRfc(rfc, { omitVerificationDigit: false });
      return result.isValid;
    },
    {
      message: "RFC inválido (verifique formato y homoclave)",
    }
  );

export type RFC = z.infer<typeof rfcSchema>;
