import { z } from "zod";
import validateCurp from "validate-curp";

/**
 * KNOWN LIBRARY LIMITATION (discovered during implementation, not in 01-RESEARCH.md):
 * `validate-curp@1.0.0`'s published `dist/index.js` bundle hardcodes its format regex as
 * `[HM]` at the sex-character position — it unconditionally rejects any syntactically valid
 * CURP whose sex char is `X` with `INVALID_FORMAT`, even when checksum/date/state would all
 * pass. Confirmed by inspecting `node_modules/validate-curp/dist/index.js` and by direct
 * invocation: `validateCurp("MOTR930411XJCRMN07")` -> `{ isValid: false, errors: ["INVALID_FORMAT"] }`
 * even though "07" is the mathematically correct check digit for that string under the exact
 * same algorithm the library implements for H/M. There is only one published version (1.0.0)
 * of this library on npm, so no upgrade path exists.
 *
 * This contradicts D-06 (01-CONTEXT.md) and Pitfall 6 (01-RESEARCH.md), both of which assumed
 * native H/M/X support. To honor D-06 (VALID-01 must accept X) without abandoning the library
 * for the H/M cases (the vast majority of real CURPs), curpSchema:
 *   1. Delegates FULLY to `validateCurp()` first — this covers checksum, date, state, and
 *      forbidden-word checks for H/M CURPs exactly as the library intends.
 *   2. Only when `validateCurp()` rejects a string SOLELY because of the sex-character format
 *      gate (i.e., the string matches an [HMX]-extended version of the library's own format
 *      regex, with sex char === "X"), falls back to a local re-implementation of the SAME
 *      published RENAPO check-digit / date / state / forbidden-word algorithm the library
 *      itself implements (verified byte-for-byte identical against `validateCurp`'s own H/M
 *      output for the same base CURP with a different sex character — see curp.test.ts).
 *      This is not an invented/hand-rolled checksum; it mirrors the library's own algorithm,
 *      extended only to admit the X character that the library's regex arbitrarily excludes.
 */

const CURP_LENGTH = 18;

// Same shape as validate-curp's internal format regex, extended with X at the sex-char
// position (index 10). Used only to gate the local X fallback below — never to replace
// the library's own validation for H/M.
const CURP_FORMAT_REGEX =
  /^[A-Z][AEIOUX][A-Z]{2}[0-9]{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;

// Sourced from validate-curp's own MIT-licensed published bundle (dist/index.js), reused here
// only to extend the same checks to the X-sex branch that the library's regex blocks.
const VALID_STATES = [
  "AS", "BC", "BS", "CC", "CL", "CM", "CS", "CH", "DF", "DG", "GT", "GR", "HG",
  "JC", "MC", "MN", "MS", "NT", "NL", "OC", "PL", "QT", "QR", "SP", "SL", "SR",
  "TC", "TS", "TL", "VZ", "YN", "ZS", "NE",
];

const FORBIDDEN_WORDS = [
  "BACA", "BAKA", "BUEI", "BUEY", "CACA", "CACO", "CAGA", "CAGO", "CAKA", "CAKO",
  "COGE", "COGI", "COJA", "COJE", "COJI", "COJO", "COLA", "CULO", "FALO", "FETO",
  "GETA", "GUEI", "GUEY", "JETA", "JOTO", "KACA", "KACO", "KAGA", "KAGO", "KAKA",
  "KAKO", "KOGE", "KOGI", "KOJA", "KOJE", "KOJI", "KOJO", "KOLA", "KULO", "LILO",
  "LOCA", "LOCO", "LOKA", "LOKO", "MAME", "MAMO", "MEAR", "MEAS", "MEON", "MIAR",
  "MION", "MOCO", "MOKO", "MULA", "MULO", "NACA", "NACO", "PEDA", "PEDO", "PENE",
  "PIPI", "PITO", "POPO", "PUTA", "PUTO", "QULO", "RATA", "ROBA", "ROBE", "ROBO",
  "RUIN", "SENO", "TETA", "VACA", "VAGA", "VAGO", "VAKA", "VUEI", "VUEY", "WUEI",
  "WUEY",
];

const CHECK_DIGIT_VALUES: Record<string, number> = {
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 18, J: 19, K: 20,
  L: 21, M: 22, N: 23, Ñ: 24, O: 25, P: 26, Q: 27, R: 28, S: 29, T: 30, U: 31,
  V: 32, W: 33, X: 34, Y: 35, Z: 36,
};

function computeCheckDigit(curp18: string): string {
  const base = curp18.slice(0, -1);
  const score = base
    .split("")
    .reduce((sum, char, i) => sum + (CHECK_DIGIT_VALUES[char] ?? 0) * (18 - i), 0);
  const mod = score % 10;
  return mod === 0 ? "0" : String(10 - mod);
}

function isValidDateLocal(curp: string): boolean {
  const dateStr = curp.slice(4, 10);
  const yy = Number(dateStr.slice(0, 2));
  const month = Number(dateStr.slice(2, 4));
  const day = Number(dateStr.slice(4, 6));
  if (!Number.isInteger(yy) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  // RENAPO century rule: the homoclave differentiator (index 16) is a digit for
  // births 1900–1999 and a letter for births 2000+. Using it fixes the century
  // deterministically — never assume 20YY (a 1993 birth must not become 2093).
  const century = /[0-9]/.test(curp.charAt(16)) ? 1900 : 2000;
  const year = century + yy;
  // Strict calendar reconstruction rejects impossible dates (e.g. 1900-02-29,
  // month 13, day 32) that Date would otherwise roll over.
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidStateLocal(curp: string): boolean {
  return VALID_STATES.includes(curp.slice(11, 13));
}

function hasForbiddenWordLocal(curp: string): boolean {
  return FORBIDDEN_WORDS.includes(curp.slice(0, 4));
}

/** Local fallback validation for X-sex CURPs only — see module doc comment above. */
function validateXSexCurp(curp: string): string[] {
  const errors: string[] = [];
  if (!isValidDateLocal(curp)) errors.push("INVALID_DATE");
  if (!isValidStateLocal(curp)) errors.push("INVALID_STATE");
  if (computeCheckDigit(curp) !== curp.slice(-1)) errors.push("INVALID_CHECK_DIGIT");
  if (hasForbiddenWordLocal(curp)) errors.push("FORBIDDEN_WORD");
  return errors;
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_FORMAT: "Formato de CURP inválido",
  INVALID_DATE: "La fecha de nacimiento no es válida",
  INVALID_STATE: "La entidad federativa no existe",
  INVALID_CHECK_DIGIT: "El dígito verificador es incorrecto",
  FORBIDDEN_WORD: "El CURP contiene una palabra prohibida",
};

export const curpSchema = z
  .string()
  .length(CURP_LENGTH, "CURP debe tener exactamente 18 caracteres")
  .toUpperCase()
  .superRefine((curp, ctx) => {
    const result = validateCurp(curp);
    if (result.isValid) return;

    const isXSexShape = curp.charAt(10) === "X" && CURP_FORMAT_REGEX.test(curp);
    if (isXSexShape) {
      const xErrors = validateXSexCurp(curp);
      if (xErrors.length === 0) return;
      xErrors.forEach((code) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ERROR_MESSAGES[code] ?? "CURP inválido",
          path: [],
        });
      });
      return;
    }

    (result.errors ?? []).forEach((code) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ERROR_MESSAGES[code] ?? "CURP inválido",
        path: [],
      });
    });
  });

export type CURP = z.infer<typeof curpSchema>;
