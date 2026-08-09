/**
 * Validation Rules Types
 * Validation result and error types
 */

export interface FormValidationError {
  field: string;
  message: string;
  value?: any;
  rule?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormValidationError[];
}
