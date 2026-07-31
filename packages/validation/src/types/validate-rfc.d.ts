declare module "validate-rfc" {
  interface ValidateRfcResult {
    isValid: boolean;
    rfc: string | null;
    type: string | null;
    errors?: string[];
  }

  interface ValidateRfcOptions {
    omitVerificationDigit?: boolean;
  }

  export default function validateRfc(
    rfc: string,
    options?: ValidateRfcOptions
  ): ValidateRfcResult;
}
