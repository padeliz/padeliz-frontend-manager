import type { ChallengeActionRecord, ChallengeLocalDocument } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'challenge-session:';
export const LOCAL_ACTION_WINDOW = 25;

export function challengeStorageKey(sessionId: number): string {
  return `${KEY_PREFIX}${sessionId}`;
}

/** Exported for tests — do not call from logout. */
export async function clearChallengeDoc(sessionId: number): Promise<void> {
  await AsyncStorage.removeItem(challengeStorageKey(sessionId));
}

/** Intentionally not wired to auth logout — local docs must survive re-login. */
export function clearAllChallengeDocsOnLogout(): never {
  throw new Error(
    'Challenge local docs must not be cleared on logout (see plan).'
  );
}

export function isCompatibleChallengeDoc(
  value: unknown
): value is ChallengeLocalDocument {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Record<string, unknown>;
  if (typeof doc.dirty !== 'boolean') return false;
  if (typeof doc.state_sequence !== 'number') return false;
  if (!Array.isArray(doc.actions)) return false;
  if ('outbox' in doc) return false;
  const state = doc.state as Record<string, unknown> | undefined;
  if (!state || typeof state !== 'object') return false;
  const session = state.session as Record<string, unknown> | undefined;
  if (!session || typeof session !== 'object') return false;
  if (typeof session.id_challenge_session !== 'number') return false;
  if (typeof session.inserted_at !== 'number') return false;
  if (typeof session.type !== 'string') return false;
  if (typeof session.status !== 'string') return false;
  return true;
}

export function trimActionsForStatus(
  actions: ChallengeActionRecord[],
  status: string
): ChallengeActionRecord[] {
  if (status !== 'active') return actions;
  if (actions.length <= LOCAL_ACTION_WINDOW) return actions;
  return actions.slice(-LOCAL_ACTION_WINDOW);
}

export async function loadChallengeDoc(
  sessionId: number
): Promise<ChallengeLocalDocument | null> {
  const raw = await AsyncStorage.getItem(challengeStorageKey(sessionId));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isCompatibleChallengeDoc(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveChallengeDoc(
  sessionId: number,
  doc: ChallengeLocalDocument
): Promise<void> {
  await AsyncStorage.setItem(
    challengeStorageKey(sessionId),
    JSON.stringify(doc)
  );
}
