import { challengesApi } from '@/services/api/challengesApi';
import type { ApiChallengeSession } from '@/types/api/challenge';
import { emptyBoard } from './types';
import { loadChallengeDoc, saveChallengeDoc } from './localStore';
import { sessionPayloadFromApi } from './syncPayload';
import { scheduleFlush } from './flushScheduler';
import type { ChallengeBoardState, ChallengeLocalDocument } from './types';

export {
  applyUpsertAck,
  flushStatePass,
  scheduleFlush,
  keepaliveUpsert,
  registerUnloadGuards,
  attachSyncStatus,
  resetFlushSchedulerForTests,
} from './flushScheduler';

export class SessionUnavailableError extends Error {
  constructor(message = 'Session unavailable.') {
    super(message);
    this.name = 'SessionUnavailableError';
  }
}

function boardFromRemote(
  session: ApiChallengeSession,
  stateJson: Record<string, unknown>
): ChallengeBoardState {
  const payload = sessionPayloadFromApi(session);
  const board = stateJson as Partial<ChallengeBoardState>;
  if (
    board &&
    typeof board === 'object' &&
    Array.isArray(board.participants)
  ) {
    return {
      ...emptyBoard(payload),
      ...board,
      session: payload,
    } as ChallengeBoardState;
  }
  return emptyBoard(payload);
}

export function docFromRemote(
  session: ApiChallengeSession,
  stateJson: Record<string, unknown>,
  stateSequence: number
): ChallengeLocalDocument {
  return {
    state: boardFromRemote(session, stateJson),
    state_sequence: stateSequence,
    actions: [],
    dirty: false,
  };
}

export async function seedLocalFromCreate(
  session: ApiChallengeSession
): Promise<ChallengeLocalDocument> {
  const doc: ChallengeLocalDocument = {
    state: emptyBoard(sessionPayloadFromApi(session)),
    state_sequence: session.state_sequence ?? 0,
    actions: [],
    dirty: true,
  };
  await saveChallengeDoc(session.id_challenge_session, doc);
  return doc;
}

/**
 * Load local if valid; otherwise GET state. Never overwrite valid local.
 */
export async function hydrateSession(sessionId: number): Promise<{
  doc: ChallengeLocalDocument;
  shouldFlush: boolean;
}> {
  const local = await loadChallengeDoc(sessionId);
  if (local) {
    return { doc: local, shouldFlush: local.dirty };
  }

  try {
    const stateRes = await challengesApi.getState(sessionId);
    const remoteSession = stateRes.data.session as ApiChallengeSession;
    const doc = docFromRemote(
      {
        ...remoteSession,
        inserted_at:
          remoteSession.inserted_at ??
          (stateRes.data.session as { inserted_at?: number }).inserted_at ??
          remoteSession.started_at,
      },
      stateRes.data.state_json,
      stateRes.data.state_sequence
    );
    await saveChallengeDoc(sessionId, doc);
    return { doc, shouldFlush: false };
  } catch (e) {
    const status =
      e && typeof e === 'object' && 'status' in e
        ? (e as { status: number }).status
        : undefined;
    if (status === 404) {
      throw new SessionUnavailableError();
    }
    throw e;
  }
}
