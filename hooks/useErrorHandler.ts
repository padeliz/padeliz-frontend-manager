/**
 * Error Handler Hook
 * Centralized error handling with toast notifications and retry logic
 */

import { useToast } from '@/context/ToastContext';
import { ErrorHandlerOptions, RetryState } from '@/types/hooks/error-handler';
import {
  formatApiError,
  getErrorTitle,
  getRetryDelay,
  isRetryableError,
} from '@/utils/errorMessages';
import { useCallback, useRef } from 'react';

export function useErrorHandler() {
  const { showError, showWarning, showInfo } = useToast();
  const retryStateRef = useRef<Map<string, RetryState>>(new Map());

  const handleError = useCallback(
    async (
      error: any,
      options: ErrorHandlerOptions = {}
    ): Promise<void> => {
      const {
        showToast = true,
        retryable = true,
        maxRetries = 3,
        onRetry,
        onSuccess,
        onFinalError,
      } = options;

      const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const retryState = retryStateRef.current.get(errorId) || {
        isRetrying: false,
        attempt: 0,
        maxAttempts: maxRetries,
      };

      // Format error message
      const errorMessage = formatApiError(error);
      const errorTitle = getErrorTitle(error);

      // Check if error is retryable and we haven't exceeded max retries
      const canRetry = retryable &&
                      isRetryableError(error) &&
                      retryState.attempt < retryState.maxAttempts &&
                      onRetry;

      if (canRetry && !retryState.isRetrying) {
        retryState.isRetrying = true;
        retryState.attempt += 1;
        retryStateRef.current.set(errorId, retryState);

        // Show retry notification
        if (showToast) {
          showWarning(
            'Retrying...',
            `Attempt ${retryState.attempt} of ${retryState.maxAttempts}`
          );
        }

        // Wait before retry
        const delay = getRetryDelay(error, retryState.attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
          const result = await onRetry();
          retryStateRef.current.delete(errorId);

          if (onSuccess) {
            onSuccess(result);
          }

          if (showToast) {
            showInfo('Success', 'Operation completed successfully');
          }

          return;
        } catch (retryError) {
          // Retry failed, continue with error handling
          retryState.isRetrying = false;
          retryStateRef.current.set(errorId, retryState);

          // Recursively handle the retry error
          return handleError(retryError, {
            ...options,
            maxRetries: maxRetries - 1,
          });
        }
      }

      // Final error handling
      retryStateRef.current.delete(errorId);

      if (showToast) {
        showError(errorTitle, errorMessage);
      }

      if (onFinalError) {
        onFinalError(error);
      }

      // Log error for debugging
      console.error('Error handled:', {
        error,
        errorMessage,
        errorTitle,
        attempt: retryState.attempt,
        maxAttempts: retryState.maxAttempts,
      });
    },
    [showError, showWarning, showInfo]
  );

  const handleApiError = useCallback(
    (error: any, options: Omit<ErrorHandlerOptions, 'retryable'> = {}) => {
      return handleError(error, { ...options, retryable: true });
    },
    [handleError]
  );

  const handleValidationError = useCallback(
    (error: any, options: Omit<ErrorHandlerOptions, 'retryable'> = {}) => {
      return handleError(error, { ...options, retryable: false });
    },
    [handleError]
  );

  const handleNetworkError = useCallback(
    (error: any, options: Omit<ErrorHandlerOptions, 'retryable'> = {}) => {
      return handleError(error, { ...options, retryable: true });
    },
    [handleError]
  );

  const clearRetryState = useCallback((errorId?: string) => {
    if (errorId) {
      retryStateRef.current.delete(errorId);
    } else {
      retryStateRef.current.clear();
    }
  }, []);

  return {
    handleError,
    handleApiError,
    handleValidationError,
    handleNetworkError,
    clearRetryState,
  };
}
