/**
 * Error Message Utilities
 * Centralized error message mapping and formatting
 */

import { ErrorValidation } from '@/types/errors/validation';

/**
 * HTTP Status Code to User-Friendly Message Mapping
 */
export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Authentication required. Please log in again.',
  403: "Access denied. You don't have permission to perform this action.",
  404: 'Resource not found. The requested item may have been deleted.',
  409: 'Conflict. This resource already exists or conflicts with existing data.',
  422: 'Validation error. Please check your input and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Server error. Please try again later or contact support.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service temporarily unavailable. Please try again later.',
  504: 'Request timeout. Please try again later.',
};

/**
 * Network Error Messages
 */
export const NETWORK_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  TIMEOUT: 'Request timeout. Please try again.',
  CONNECTION_REFUSED: 'Unable to connect to server. Please try again later.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

/**
 * Format API error for display
 */
export function formatApiError(error: any): string {
  // Handle structured API errors
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Handle validation errors
  if (error?.response?.data?.errors) {
    const errors = error.response.data.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors.map((err: any) => err.message || err).join(', ');
    }
  }

  // Handle HTTP status codes
  if (error?.response?.status) {
    return (
      HTTP_STATUS_MESSAGES[error.response.status] ||
      `Error ${error.response.status}. Please try again.`
    );
  }

  // Handle network errors
  if (
    error?.code === 'NETWORK_ERROR' ||
    error?.message?.includes('Network Error')
  ) {
    return NETWORK_ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return NETWORK_ERROR_MESSAGES.TIMEOUT;
  }

  // Handle generic errors
  if (error?.message) {
    return error.message;
  }

  return NETWORK_ERROR_MESSAGES.UNKNOWN;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ErrorValidation[]): string {
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'Validation failed. Please check your input.';
  }

  return errors.map(error => `${error.field}: ${error.message}`).join(', ');
}

/**
 * Get error title based on error type
 */
export function getErrorTitle(error: any): string {
  if (error?.response?.status === 401) {
    return 'Authentication Required';
  }

  if (error?.response?.status === 403) {
    return 'Access Denied';
  }

  if (error?.response?.status === 404) {
    return 'Not Found';
  }

  if (error?.response?.status === 422) {
    return 'Validation Error';
  }

  if (error?.response?.status >= 500) {
    return 'Server Error';
  }

  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return 'Network Error';
  }

  return 'Error';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return true;
  }

  // Timeout errors are retryable
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return true;
  }

  // 5xx server errors are retryable
  if (error?.response?.status >= 500) {
    return true;
  }

  // 429 (Too Many Requests) is retryable
  if (error?.response?.status === 429) {
    return true;
  }

  return false;
}

/**
 * Get retry delay based on error type
 */
export function getRetryDelay(error: any, attempt: number): number {
  // Exponential backoff with jitter
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter

  return delay + jitter;
}
