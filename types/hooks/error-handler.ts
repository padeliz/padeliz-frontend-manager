/**
 * Error Handler Hook Types
 * Types for error handler hooks
 */

export interface ErrorHandlerOptions {
  showToast?: boolean;
  retryable?: boolean;
  maxRetries?: number;
  onRetry?: () => Promise<any>;
  onSuccess?: (data: any) => void;
  onFinalError?: (error: any) => void;
}

export interface RetryState {
  isRetrying: boolean;
  attempt: number;
  maxAttempts: number;
}
