declare module "validate-curp" {
  interface ValidateCurpResult {
    isValid: boolean;
    curp: string | null;
    errors?: string[];
  }

  export default function validateCurp(curp: string): ValidateCurpResult;
}
