/**
 * Edition / schedule / lottery API types (loose shapes matching backend resources).
 */

import { ApiEditionDivisionSchedule } from './entities';

/**
 * Playing times are owned by the edition division and rejected here by the API.
 */
export interface ScheduleFormPayload {
  player_opponents_nr?: number;
  player_matches_repeat?: number;
  include_final?: boolean;
  has_demonstrative_match?: boolean;
  include_scores?: boolean;
  allow_replacements?: boolean;
  points_per_match?: number | null;
  final_points_target?: number;
  court_ids?: number[];
  participation_ids?: number[];
  is_collecting_points?: Record<string, boolean>;
  template_version?: number | null;
  adjust?: number;
  confirm_replace?: boolean;
}

export interface ScheduleMatchPreview {
  side_a: number[];
  side_b: number[];
  starts_at?: string;
  ends_at?: string;
  round_index?: number;
  court_index?: number;
  court_name?: string;
}

export interface SchedulePreview {
  player_ids?: number[];
  opponents_per_player?: number;
  repeat_partners?: number;
  court_names?: string[];
  courts_count?: number;
  time_start?: string;
  time_end?: string;
  include_final?: boolean;
  has_demonstrative_match?: boolean;
  template_version?: number;
  rounds_total?: number;
  matches_count?: number;
  points_per_match?: number;
  partners_count_variation?: number;
  partners_count?: number;
  players_met?: number;
  /** Nested by court index, or occasionally a flat list — use flattenMatchesByCourt() */
  matches_by_court?:
    | ScheduleMatchPreview[]
    | ScheduleMatchPreview[][]
    | Record<string, ScheduleMatchPreview[]>;
  [key: string]: unknown;
}

export interface ScheduleBoardMetrics {
  players_count: number;
  matches_count: number;
  points_per_match: number | null;
  partners_count?: Record<string | number, number>;
  partners_count_variation: number;
  players_met?: Record<string | number, Record<string | number, number>>;
  min_opponents_met: number;
  max_opponents_met: number;
  playing_distribution: {
    min?: number;
    avg?: number;
    css_class?: string;
    percentage?: number;
    per_player?: Record<
      string | number,
      { score: number; percentage: number; css_class: string }
    >;
  };
  template_identity: {
    players: number;
    partners: number | null;
    repeat: number | null;
    courts: number;
    version: number | null;
  };
}

export interface SchedulePlayerBoardRow {
  participation_id: number;
  player_id: number;
  short_name: string;
  pdf_avatar_url: string | null;
  is_collecting_points: boolean;
}

export interface ScheduleState {
  edition_division: any;
  /** Null until the first schedule form upsert. */
  schedule?: ApiEditionDivisionSchedule | null;
  courts: any[];
  participations: any[];
  matches: GameMatch[];
  has_regular_matches: boolean;
  has_scores: boolean;
  has_standings: boolean;
  is_finalized: boolean;
  board_metrics?: ScheduleBoardMetrics | null;
  players_board?: SchedulePlayerBoardRow[];
}

export interface GameMatchSidePlayer {
  player_id?: number;
  participation_id?: number;
  player?: { id_player?: number; name?: string; first_name?: string; last_name?: string };
  participation?: {
    id_participation?: number;
    player?: { id_player?: number; name?: string; first_name?: string; last_name?: string } | null;
  } | null;
}

export interface GameMatchSide {
  side?: 'LEFT' | 'RIGHT' | string;
  score?: number | null;
  couple_image_url?: string | null;
  players?: GameMatchSidePlayer[];
}

export interface GameMatch {
  id_match: number;
  edition_division_id?: number;
  edition_division_court_id?: number;
  match_kind?: string;
  sequence_no?: number;
  scheduled_start?: string;
  scheduled_end?: string;
  points_target?: number;
  sides?: GameMatchSide[];
  edition_division_court?: {
    id_edition_division_court?: number;
    court?: { id_court?: number; name?: string };
  };
}

export interface StandingRow {
  id_standing: number;
  edition_division_id: number;
  participation_id: number;
  points_total: number;
  wins: number;
  rank: number;
  participation?: any;
}

export interface ReplacementRow {
  id_replacement: number;
  edition_division_id?: number;
  original_participation_id: number;
  substitute_participation_id?: number;
  substitute_player_id?: number;
  match_id?: number | null;
  edition_division?: {
    id_edition_division?: number;
    division_title?: string | null;
    edition_id?: number;
    division_id?: number;
  } | null;
  original_participation?: {
    id_participation?: number;
    player?: {
      id_player?: number;
      name?: string;
      first_name?: string;
      last_name?: string;
    } | null;
  } | null;
  substitute_participation?: {
    id_participation?: number;
    player?: {
      id_player?: number;
      name?: string;
      first_name?: string;
      last_name?: string;
    } | null;
  } | null;
  substitute_player?: {
    id_player?: number;
    name?: string;
    first_name?: string;
    last_name?: string;
  } | null;
  [key: string]: unknown;
}

export interface PosterRow {
  id_edition_division_poster: number;
  poster_kind?: string;
  edition_division_court_id?: number | null;
  generated_path?: string | null;
  printed_path?: string | null;
  generated_url?: string | null;
  printed_url?: string | null;
  [key: string]: unknown;
}

export interface LotteryLucky {
  id_lucky: number;
  lottery_rule_id?: number;
  drawn_at?: string | number | null;
  available_at?: string | number | null;
  announced_at?: string | number | null;
  accepted_at?: string | number | null;
  rejected_at?: string | number | null;
  seconds_left?: number | null;
  prize_index?: number | null;
  prize_quantity?: number | null;
  player?: {
    id_player?: number;
    name?: string;
    avatar_url?: string | null;
  } | null;
  division?: any;
  prize?: any;
}

export interface LotteryLiveState {
  status: 'pending' | 'finished' | string;
  logo?: string;
  background?: string;
  edition?: any;
  next_edition?: any;
  lucky?: LotteryLucky | null;
  accepted?: LotteryLucky[];
}

export interface ScratchSchedulePayload {
  player_ids: number[];
  court_names: string[];
  time_start?: string;
  playing_start_time?: string;
  time_end?: string;
  playing_end_time?: string;
  opponents_per_player?: number;
  player_opponents_nr?: number;
  repeat_partners?: number;
  player_matches_repeat?: number;
  include_final?: boolean;
  has_demonstrative_match?: boolean;
  template_version?: number | null;
  adjust?: number;
  court_index?: number;
  title?: string;
  color?: string;
  edition_label?: string;
  organizer_id?: number | null;
  /** Club host branding replaced the old partner slot. */
  club_id?: number | null;
  points_per_match?: number;
  final_points_target?: number;
  include_scores?: boolean;
  allow_replacements?: boolean;
  collecting_player_ids?: number[];
}

export interface ApiCourt {
  id_court: number;
  location_id: number;
  name: string;
  is_indoor: boolean;
  display_order?: number | null;
  inserted_at?: number;
  updated_at?: number;
}

export interface ApiEditionLotteryRule {
  id_lottery_rule: number;
  lottery_prize_id: number;
  rule_prize_quantity: number;
  orderliness?: number | null;
  edition_division_id?: number | null;
  gender?: string | null;
  has_social_status?: boolean | null;
  legal_age?: boolean | null;
  lottery_prize?: {
    id_lottery_prize?: number;
    lottery_id?: number;
    prize_id?: number;
    sponsor_id?: number | null;
    prize?: { name?: string | null } | null;
    sponsor?: { name?: string | null } | null;
    [key: string]: unknown;
  } | null;
  luckies?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface PosterRow {
  id_edition_division_poster: number;
  edition_division_id?: number;
  edition_division_court_id?: number | null;
  poster_kind: string;
  generated_path?: string | null;
  printed_path?: string | null;
  generated_url?: string | null;
  printed_url?: string | null;
}
