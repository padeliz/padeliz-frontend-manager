export type ChallengeSessionType = 'king_of_the_court' | 'smash_contest';
export type ChallengeSessionStatus = 'active' | 'completed';
export type ChallengeSmashAttemptDetail =
  | 'ball_over_net'
  | 'ball_over_service_line'
  | 'ball_touching_back_glass';

export interface ApiChallengeSession {
  id_challenge_session: number;
  type: ChallengeSessionType;
  status: ChallengeSessionStatus;
  title: string;
  bottom_text: string;
  started_at: number;
  completed_at: number | null;
  state_sequence?: number;
  inserted_at?: number;
  updated_at?: number | null;
}

export interface ChallengeSessionPayload {
  id_challenge_session: number;
  type: ChallengeSessionType;
  status: ChallengeSessionStatus;
  title: string;
  bottom_text: string;
  started_at: number;
  completed_at: number | null;
  inserted_at: number;
}

export interface ApiChallengeSessionAction {
  id_challenge_session_action: number;
  challenge_session_id: number;
  client_action_id?: string;
  sequence_number: number;
  action_type: string;
  payload: Record<string, unknown> | null;
  payload_summary: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  undone_at: number | null;
  is_undone: boolean;
  occurred_at: number;
  session?: {
    id_challenge_session: number;
    title: string;
    type: ChallengeSessionType;
    status: ChallengeSessionStatus;
  };
}

/** View types used by live panels (projected from board state). */
export interface KotcLiveState {
  session: ChallengeSessionPayload;
  can_manual_jump_in: boolean;
  can_complete: boolean;
  complete_blocked_reasons: string[];
  court_count: number;
  waiting: Array<{
    participation_id: string;
    team_id: string;
    team_name: string;
    biggest_streak: number;
    second_biggest_streak: number;
    queue_position: number;
  }>;
  court: {
    team_a: KotcCourtTeam | null;
    team_b: KotcCourtTeam | null;
  };
  leaderboard: Array<{
    position: number;
    team_id: string;
    team_name: string;
    biggest_streak: number;
    second_biggest_streak: number;
    current_streak: number;
  }>;
}

export interface KotcCourtTeam {
  participation_id: string;
  team_id: string;
  team_name: string;
  current_streak: number;
  biggest_streak: number;
  second_biggest_streak: number;
}

export interface SmashLiveState {
  session: ChallengeSessionPayload;
  can_manual_jump_in: boolean;
  can_complete: boolean;
  complete_blocked_reasons: string[];
  court_count: number;
  waiting: Array<{
    participation_id: string;
    player_id: string;
    player_name: string;
    session_tries: number;
    record_hold_seconds: number;
    queue_position: number;
  }>;
  court: {
    participation_id: string;
    player_id: string;
    player_name: string;
    session_tries: number;
    record_hold_seconds: number;
    is_record_holder: boolean;
  } | null;
  leaderboard: Array<{
    player_id: string;
    player_name: string;
    session_tries: number;
    record_hold_seconds: number;
    is_record_holder: boolean;
  }>;
}
