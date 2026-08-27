import { challengesApi } from '@/services/api/challengesApi';
import { API_BASE_URL, API_MANAGER_PREFIX } from '@/utils/constants';
import { storageUtils } from '@/utils/storage';
import { loadChallengeDoc, saveChallengeDoc } from './localStore';
import { buildSyncBody } from './syncPayload';
import type { SyncStatusController } from './syncStatus';
import type { ChallengeLocalDocument } from './types';

type FlushSlot = {
  running: boolean;
  queued: boolean;
  inflight: Promise<void> | null;
  failedOnce: boolean;
  backoffAttempt: number;
  backoffTimer: ReturnType<typeof setTimeout> | null;
  status: SyncStatusController | null;
};

const slots = new Map<number, FlushSlot>();
const BACKOFF_CAP_MS = 30_000;

function getSlot(sessionId: number): FlushSlot {
  let slot = slots.get(sessionId);
  if (!slot) {
    slot = {
      running: false,
      queued: false,
      inflight: null,
      failedOnce: false,
      backoffAttempt: 0,
      backoffTimer: null,
      status: null,
    };
    slots.set(sessionId, slot);
  }
  return slot;
}

function backoffMs(attempt: number): number {
  const ms = 1000 * Math.pow(2, Math.max(0, attempt));
  return Math.min(ms, BACKOFF_CAP_MS);
}

/** Test-only: clear in-memory flush locks. */
export function resetFlushSchedulerForTests(): void {
  for (const slot of slots.values()) {
    if (slot.backoffTimer != null) clearTimeout(slot.backoffTimer);
  }
  slots.clear();
}

export function attachSyncStatus(
  sessionId: number,
  status: SyncStatusController | null
): void {
  getSlot(sessionId).status = status;
}

/**
 * Clear dirty only when the successful upsert sequence matches the current doc.
 */
export function applyUpsertAck(
  current: ChallengeLocalDocument,
  requestSequence: number
): ChallengeLocalDocument {
  if (current.state_sequence !== requestSequence) {
    return current;
  }
  return { ...current, dirty: false };
}

export async function flushStatePass(
  sessionId: number,
  snapshot: ChallengeLocalDocument
): Promise<ChallengeLocalDocument> {
  if (!snapshot.dirty) {
    return (await loadChallengeDoc(sessionId)) ?? snapshot;
  }

  const requestSequence = snapshot.state_sequence;
  await challengesApi.sync(sessionId, buildSyncBody(snapshot));

  const current = (await loadChallengeDoc(sessionId)) ?? snapshot;
  const next = applyUpsertAck(current, requestSequence);
  await saveChallengeDoc(sessionId, next);
  return next;
}

export type FlushOptions = {
  onDoc?: (doc: ChallengeLocalDocument) => void;
};

async function runFlushLoop(
  sessionId: number,
  onDoc?: (doc: ChallengeLocalDocument) => void
): Promise<void> {
  const slot = getSlot(sessionId);

  for (;;) {
    slot.queued = false;
    const snapshot = await loadChallengeDoc(sessionId);
    if (!snapshot || !snapshot.dirty) {
      if (slot.queued) continue;
      break;
    }

    const isRetry = slot.failedOnce;
    slot.status?.beginAttempt(isRetry);

    try {
      const next = await flushStatePass(sessionId, snapshot);
      slot.failedOnce = false;
      slot.backoffAttempt = 0;
      if (slot.backoffTimer != null) {
        clearTimeout(slot.backoffTimer);
        slot.backoffTimer = null;
      }
      if (!next.dirty && next.state_sequence === snapshot.state_sequence) {
        slot.status?.markSaved();
      }
      onDoc?.(next);
    } catch {
      slot.failedOnce = true;
      slot.status?.markFailed();
      scheduleBackoff(sessionId, onDoc);
      break;
    }

    if (slot.queued) continue;
    const again = await loadChallengeDoc(sessionId);
    if (again?.dirty) continue;
    break;
  }
}

function scheduleBackoff(
  sessionId: number,
  onDoc?: (doc: ChallengeLocalDocument) => void
): void {
  const slot = getSlot(sessionId);
  if (slot.backoffTimer != null) return;
  const delay = backoffMs(slot.backoffAttempt);
  slot.backoffAttempt += 1;
  slot.backoffTimer = setTimeout(() => {
    slot.backoffTimer = null;
    void scheduleFlush(sessionId, { onDoc });
  }, delay);
}

/**
 * Single-flight + coalesce: at most one in-flight upsert per session.
 */
export async function scheduleFlush(
  sessionId: number,
  options: FlushOptions = {}
): Promise<void> {
  const slot = getSlot(sessionId);
  const onDoc = options.onDoc;

  if (slot.backoffTimer != null) {
    clearTimeout(slot.backoffTimer);
    slot.backoffTimer = null;
  }

  if (slot.running && slot.inflight) {
    slot.queued = true;
    try {
      await slot.inflight;
    } catch {
      /* keep local */
    }
    return;
  }

  slot.running = true;
  const run = runFlushLoop(sessionId, onDoc).finally(() => {
    slot.running = false;
    slot.inflight = null;
    if (slot.queued) {
      slot.queued = false;
      void scheduleFlush(sessionId, { onDoc });
    }
  });
  slot.inflight = run;

  try {
    await run;
  } catch {
    /* keep local */
  }
}

/**
 * Best-effort keepalive upsert on page hide/unload.
 */
export async function keepaliveUpsert(sessionId: number): Promise<void> {
  const doc = await loadChallengeDoc(sessionId);
  if (!doc?.dirty) return;

  const token = await storageUtils.get<string>('auth_token');
  if (!token) return;

  const base = API_BASE_URL || 'http://localhost:8000';
  const prefix = API_MANAGER_PREFIX || '/api/v1/manager';
  const url = `${base}${prefix}/challenges/${sessionId}/sync`;
  const body = JSON.stringify(buildSyncBody(doc));

  try {
    await fetch(url, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      keepalive: true,
    });
  } catch {
    /* best-effort */
  }
}

export type UnloadGuard = {
  dispose: () => void;
};

/**
 * Register beforeunload warn + pagehide keepalive while dirty.
 */
export function registerUnloadGuards(
  sessionId: number,
  isDirty: () => boolean
): UnloadGuard {
  if (typeof window === 'undefined') {
    return { dispose: () => undefined };
  }

  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!isDirty()) return;
    event.preventDefault();
    event.returnValue = '';
  };

  const onPageHide = () => {
    if (!isDirty()) return;
    void keepaliveUpsert(sessionId);
  };

  window.addEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('pagehide', onPageHide);

  return {
    dispose: () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
    },
  };
}
