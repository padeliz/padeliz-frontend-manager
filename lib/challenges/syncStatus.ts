export type SyncBadgePhase =
  | 'hidden'
  | 'saving'
  | 'retrying'
  | 'saved'
  | 'failed';

export type SyncBadgeState = {
  phase: SyncBadgePhase;
  label: string | null;
};

const SAVED_LABEL = 'Saved';
const FAILED_LABEL = 'Failed';

export function syncBadgeLabel(phase: SyncBadgePhase): string | null {
  switch (phase) {
    case 'saving':
      return 'Saving...';
    case 'retrying':
      return 'Retrying...';
    case 'saved':
      return SAVED_LABEL;
    case 'failed':
      return FAILED_LABEL;
    default:
      return null;
  }
}

export type SyncStatusController = {
  getState: () => SyncBadgeState;
  subscribe: (listener: (state: SyncBadgeState) => void) => () => void;
  beginAttempt: (isRetry: boolean) => void;
  markSaved: () => void;
  markFailed: () => void;
  reset: () => void;
  /** Test helper */
  flushHideTimers: () => void;
};

const HIDE_MS = 3000;

export function createSyncStatusController(
  now: () => number = () => Date.now(),
  schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> = (
    fn,
    ms
  ) => setTimeout(fn, ms),
  clear: (id: ReturnType<typeof setTimeout>) => void = clearTimeout
): SyncStatusController {
  let phase: SyncBadgePhase = 'hidden';
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(state: SyncBadgeState) => void>();

  const emit = () => {
    const state = { phase, label: syncBadgeLabel(phase) };
    listeners.forEach(l => l(state));
  };

  const clearHide = () => {
    if (hideTimer != null) {
      clear(hideTimer);
      hideTimer = null;
    }
  };

  const scheduleHide = () => {
    clearHide();
    hideTimer = schedule(() => {
      hideTimer = null;
      phase = 'hidden';
      emit();
    }, HIDE_MS);
  };

  return {
    getState: () => ({ phase, label: syncBadgeLabel(phase) }),
    subscribe: listener => {
      listeners.add(listener);
      listener({ phase, label: syncBadgeLabel(phase) });
      return () => {
        listeners.delete(listener);
      };
    },
    beginAttempt: isRetry => {
      clearHide();
      phase = isRetry ? 'retrying' : 'saving';
      emit();
      void now;
    },
    markSaved: () => {
      clearHide();
      phase = 'saved';
      emit();
      scheduleHide();
    },
    markFailed: () => {
      clearHide();
      phase = 'failed';
      emit();
      scheduleHide();
    },
    reset: () => {
      clearHide();
      phase = 'hidden';
      emit();
    },
    flushHideTimers: () => {
      if (hideTimer != null) {
        clear(hideTimer);
        hideTimer = null;
        phase = 'hidden';
        emit();
      }
    },
  };
}
