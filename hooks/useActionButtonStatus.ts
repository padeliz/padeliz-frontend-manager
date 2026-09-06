import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionButtonStatus } from '@/components/ui/ActionButton';
import { playError, playSuccess } from '@/lib/actionButtonFeedback';

export type UseActionButtonStatusOptions = {
  successHoldMs?: number;
  /** When true, plays sound+haptic via actionButtonFeedback on success/error. */
  auditoryFeedback?: boolean;
  /** When this value changes (after first mount), status resets to idle. */
  resetKey?: string | number | null;
};

export type UseActionButtonStatusResult = {
  status: ActionButtonStatus;
  errorMessage: string | null;
  run: (fn: () => Promise<void>) => Promise<void>;
  reset: () => void;
};

function messageFromUnknown(err: unknown): string {
  if (err instanceof Error) return err.message || 'Something went wrong';
  if (typeof err === 'string') return err;
  return 'Something went wrong';
}

export function useActionButtonStatus(
  options: UseActionButtonStatusOptions = {}
): UseActionButtonStatusResult {
  const { successHoldMs, auditoryFeedback = false, resetKey } = options;
  const [status, setStatus] = useState<ActionButtonStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const generationRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetKeyRef = useRef<string | number | null | undefined>(undefined);
  const auditoryFeedbackRef = useRef(auditoryFeedback);
  auditoryFeedbackRef.current = auditoryFeedback;

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current != null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearHoldTimer();
    };
  }, [clearHoldTimer]);

  const reset = useCallback(() => {
    clearHoldTimer();
    generationRef.current += 1;
    setStatus('idle');
    setErrorMessage(null);
  }, [clearHoldTimer]);

  useEffect(() => {
    if (resetKey === undefined) return;
    if (resetKeyRef.current === undefined) {
      resetKeyRef.current = resetKey;
      return;
    }
    if (resetKeyRef.current === resetKey) return;
    resetKeyRef.current = resetKey;
    reset();
  }, [resetKey, reset]);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      clearHoldTimer();
      const generation = ++generationRef.current;
      setStatus('pending');
      setErrorMessage(null);
      try {
        await fn();
        if (generation !== generationRef.current) return;
        setStatus('success');
        setErrorMessage(null);
        if (auditoryFeedbackRef.current) {
          void playSuccess();
        }
        if (successHoldMs != null && successHoldMs > 0) {
          holdTimerRef.current = setTimeout(() => {
            if (generation !== generationRef.current) return;
            setStatus('idle');
          }, successHoldMs);
        }
      } catch (err) {
        if (generation !== generationRef.current) return;
        setStatus('error');
        setErrorMessage(messageFromUnknown(err));
        if (auditoryFeedbackRef.current) {
          void playError();
        }
      }
    },
    [clearHoldTimer, successHoldMs]
  );

  return { status, errorMessage, run, reset };
}
