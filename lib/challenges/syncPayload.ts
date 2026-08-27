import type { ApiChallengeSession } from '@/types/api/challenge';
import type { ChallengeLocalDocument } from './types';
import type { ChallengeSyncRequest } from '@/services/api/challengesApi';

export function buildSyncBody(doc: ChallengeLocalDocument): ChallengeSyncRequest {
  const session = doc.state.session;
  return {
    id_challenge_session: session.id_challenge_session,
    type: session.type,
    status: session.status,
    title: session.title,
    bottom_text: session.bottom_text,
    started_at: session.started_at,
    completed_at: session.completed_at,
    inserted_at: session.inserted_at,
    state_json: doc.state,
    state_sequence: doc.state_sequence,
  };
}

export function sessionPayloadFromApi(
  session: ApiChallengeSession
): ChallengeLocalDocument['state']['session'] {
  return {
    id_challenge_session: session.id_challenge_session,
    type: session.type,
    status: session.status,
    title: session.title,
    bottom_text: session.bottom_text,
    started_at: session.started_at,
    completed_at: session.completed_at,
    inserted_at:
      typeof session.inserted_at === 'number'
        ? session.inserted_at
        : session.started_at,
  };
}
