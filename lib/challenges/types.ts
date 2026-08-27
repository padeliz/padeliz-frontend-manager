import type {
  ChallengeSessionPayload,
  ChallengeSessionStatus,
  ChallengeSessionType,
  ChallengeSmashAttemptDetail,
} from '@/types/api/challenge';

export type ChallengeActionType =
  | 'participant_added'
  | 'participant_removed'
  | 'participant_jumped_in'
  | 'session_renamed'
  | 'session_bottom_text_renamed'
  | 'session_completed'
  | 'session_reactivated'
  | 'kotc_match_resolved'
  | 'smash_attempt_recorded'
  | 'waiting_reordered'
  | 'participant_returned_to_waiting'
  | 'participant_requeued'
  | 'undo';

export type ChallengeDomainErrorCode = 'duplicate_active';

export type ChallengeDuplicateLocation = 'waiting' | 'court';

export type KotcSlot = 'waiting' | 'court_a' | 'court_b' | 'removed';
export type SmashSlot = 'waiting' | 'on_court' | 'removed';

export interface KotcParticipant {
  participation_id: string;
  team_id: string;
  team_name: string;
  name_normalized: string;
  slot: KotcSlot;
  queue_position: number | null;
  current_streak: number;
  biggest_streak: number;
  second_biggest_streak: number;
  leaderboard_eligible: boolean;
}

export interface SmashParticipant {
  participation_id: string;
  player_id: string;
  player_name: string;
  name_normalized: string;
  slot: SmashSlot;
  queue_position: number | null;
  session_tries: number;
  record_hold_seconds: number;
  is_record_holder: boolean;
  record_held_since: number | null;
  leaderboard_eligible: boolean;
}

export interface ChallengeBoardState {
  session: ChallengeSessionPayload;
  participants: KotcParticipant[] | SmashParticipant[];
  can_manual_jump_in: boolean;
  can_complete: boolean;
  complete_blocked_reasons: string[];
  court_count: number;
  waiting: Array<Record<string, unknown>>;
  court: unknown;
  leaderboard: Array<Record<string, unknown>>;
}

export interface ChallengeActionRecord {
  client_action_id: string;
  sequence_number: number;
  action_type: ChallengeActionType;
  before_state: ChallengeBoardState;
  payload: Record<string, unknown> | null;
  payload_summary: string;
  occurred_at: number;
}

export interface ChallengeLocalDocument {
  state: ChallengeBoardState;
  state_sequence: number;
  actions: ChallengeActionRecord[];
  dirty: boolean;
}

export interface ChallengeDomainError {
  message: string;
  code?: ChallengeDomainErrorCode;
  duplicate?: {
    id: string;
    location: ChallengeDuplicateLocation;
  };
}

export type ChallengeSmashDetail = ChallengeSmashAttemptDetail | '';

export function isKotc(state: ChallengeBoardState): boolean {
  return state.session.type === 'king_of_the_court';
}

export function isSmash(state: ChallengeBoardState): boolean {
  return state.session.type === 'smash_contest';
}

export function emptyBoard(
  session: ChallengeSessionPayload
): ChallengeBoardState {
  const base = {
    session,
    participants: [] as KotcParticipant[] | SmashParticipant[],
    can_manual_jump_in: true,
    can_complete: true,
    complete_blocked_reasons: [] as string[],
    court_count: 0,
    waiting: [] as Array<Record<string, unknown>>,
    leaderboard: [] as Array<Record<string, unknown>>,
  };

  if (session.type === 'king_of_the_court') {
    return {
      ...base,
      court: { team_a: null, team_b: null },
    };
  }

  return {
    ...base,
    court: null,
  };
}

export function cloneBoard(state: ChallengeBoardState): ChallengeBoardState {
  return JSON.parse(JSON.stringify(state)) as ChallengeBoardState;
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function assertActive(
  state: ChallengeBoardState
): ChallengeDomainError | null {
  if (state.session.status === 'completed') {
    return { message: 'Session is completed.' };
  }
  return null;
}

export type { ChallengeSessionStatus, ChallengeSessionType };
