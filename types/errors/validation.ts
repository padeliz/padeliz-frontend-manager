/**
 * Validation Error Types
 * Validation-related error handling types
 */

export interface ErrorValidation {
  field: string;
  message: string;
  code?: string;
}
