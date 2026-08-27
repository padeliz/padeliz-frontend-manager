import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  projectKotcViews,
  projectSmashViews,
} from '@/lib/challenges/deriveFlags';
import { reduceKotc, type KotcCommand } from '@/lib/challenges/kotcReducer';
import { reduceSmash, type SmashCommand } from '@/lib/challenges/smashReducer';
import {
  applyCommandResult,
  applyUndo,
} from '@/lib/challenges/undo';
import { saveChallengeDoc } from '@/lib/challenges/localStore';
import {
  attachSyncStatus,
  hydrateSession,
  registerUnloadGuards,
  scheduleFlush,
  SessionUnavailableError,
} from '@/lib/challenges/syncEngine';
import {
  createSyncStatusController,
  type SyncBadgeState,
} from '@/lib/challenges/syncStatus';
import type {
  ChallengeDomainError,
  ChallengeLocalDocument,
} from '@/lib/challenges/types';
import { isKotc } from '@/lib/challenges/types';

export function useChallengeSession(sessionId: number) {
  const [doc, setDoc] = useState<ChallengeLocalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [syncBadge, setSyncBadge] = useState<SyncBadgeState>({
    phase: 'hidden',
    label: null,
  });
  const docRef = useRef(doc);
  docRef.current = doc;

  const statusController = useMemo(() => createSyncStatusController(), []);

  useEffect(() => {
    attachSyncStatus(sessionId, statusController);
    return statusController.subscribe(setSyncBadge);
  }, [sessionId, statusController]);

  useEffect(() => {
    const guard = registerUnloadGuards(
      sessionId,
      () => docRef.current?.dirty === true
    );
    return () => guard.dispose();
  }, [sessionId]);

  const persist = useCallback(
    async (next: ChallengeLocalDocument) => {
      setDoc(next);
      await saveChallengeDoc(sessionId, next);
      void scheduleFlush(sessionId, {
        onDoc: synced => {
          docRef.current = synced;
          setDoc(synced);
        },
      });
    },
    [sessionId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { doc: hydrated, shouldFlush } = await hydrateSession(sessionId);
        if (cancelled) return;
        setDoc(hydrated);
        docRef.current = hydrated;
        if (shouldFlush) {
          void scheduleFlush(sessionId, {
            onDoc: synced => {
              if (cancelled) return;
              docRef.current = synced;
              setDoc(synced);
            },
          });
        }
      } catch (e) {
        if (!cancelled) {
          const message =
            e instanceof SessionUnavailableError
              ? e.message
              : e instanceof Error
                ? e.message
                : 'Failed to load session';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!doc || doc.state.session.type !== 'smash_contest') return;
    if (doc.state.session.status !== 'active') return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [doc?.state.session.type, doc?.state.session.status, sessionId]);

  const live = doc
    ? doc.state.session.type === 'king_of_the_court'
      ? projectKotcViews(doc.state)
      : projectSmashViews(doc.state)
    : null;
  void tick;

  const runKotc = useCallback(
    async (command: KotcCommand): Promise<ChallengeDomainError | void> => {
      const current = docRef.current;
      if (!current) return;
      const result = reduceKotc(
        current.state,
        command,
        current.state_sequence + 1
      );
      if (!('state' in result)) {
        if (result.code === 'duplicate_active') {
          return result;
        }
        if (result.message) setError(result.message);
        return result;
      }
      setError(null);
      await persist(applyCommandResult(current, result));
    },
    [persist]
  );

  const runSmash = useCallback(
    async (command: SmashCommand): Promise<ChallengeDomainError | void> => {
      const current = docRef.current;
      if (!current) return;
      const result = reduceSmash(
        current.state,
        command,
        current.state_sequence + 1
      );
      if (!('state' in result)) {
        if (result.code === 'duplicate_active') {
          return result;
        }
        if (result.message) setError(result.message);
        return result;
      }
      setError(null);
      await persist(applyCommandResult(current, result));
    },
    [persist]
  );

  const undo = useCallback(async () => {
    const current = docRef.current;
    if (!current) return;
    const result = applyUndo(current);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setError(null);
    await persist(result.doc);
  }, [persist]);

  return {
    doc,
    live,
    loading,
    error,
    syncBadge,
    runKotc,
    runSmash,
    undo,
    isKotcSession: doc ? isKotc(doc.state) : false,
  };
}
