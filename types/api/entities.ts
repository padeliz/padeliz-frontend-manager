/**
 * API Entity Types
 * Core business entities from the backend API
 */

export interface ApiClub {
  id_club: number;
  name: string;
  city: string;
  inserted_at: number;
  updated_at?: number;
  locations?: ApiLocation[];
}

export interface ApiDivision {
  id_division: number;
  name: string;
  color: string;
  is_students_only: boolean;
  its_first_edition_id: number;
  inserted_at: number;
  updated_at?: number;
}

export interface ApiEdition {
  id_edition: number;
  location_id: number;
  name: string;
  date: string;
  entry_fee?: number;
  students_entry_fee?: number;
  arriving_time?: string;
  closing_time?: string;
  inserted_at: number;
  updated_at?: number;
  location?: ApiLocation;
  divisions?: ApiEditionDivision[];
  participations?: ApiEditionParticipation[];
}

export interface ApiEditionDivision {
  id_edition_division: number;
  edition_id: number;
  division_id: number;
  players_limit: number;
  court: string;
  playing_start_time: string;
  playing_end_time: string;
  player_opponents_nr?: number;
  player_matches_repeat: number;
  include_scores: boolean;
  has_demonstrative_match: boolean;
  fixed_teams: boolean;
  inserted_at: number;
  updated_at?: number;
  division?: ApiDivision;
}

export interface ApiLocation {
  id_location: number;
  club_id: number;
  name: string;
  address: string;
  total_indoors_courts: number;
  total_outdoor_courts: number;
  inserted_at: number;
  updated_at?: number;
  club?: ApiClub;
}

export interface ApiPlayer {
  id_player: number;
  name: string;
  google_id?: string;
  google_name?: string;
  google_email?: string;
  google_avatar?: string;
  phone?: string;
  skill_division?: number;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  year_of_birth?: number;
  being_student: boolean;
  playtomic_id?: string;
  rankedin_id?: string;
  user_types?: string[];
  instagram_username?: string;
  facebook_username?: string;
  inserted_at: number;
  updated_at?: number;
  uploaded_profile_urls?: string[];
  participations?: ApiEditionParticipation[];
}

export interface ApiEditionParticipation {
  id_participation: number;
  edition_id: number;
  player_id: number;
  division_id: number;
  is_minor: boolean;
  is_student: boolean;
  discount?: number;
  payment: number;
  absence_reason?: 'SICK' | 'FORGOT' | 'EXAMS' | 'RECONSIDERED';
  ban_reason?: 'LEFT SUDDENLY' | 'AGGRESSIVE PLAYER' | 'LIBIDINOUS' | '';
  inserted_at: number;
  updated_at?: number;
  player?: ApiPlayer;
  division?: ApiDivision;
}

export interface ApiPrize {
  id_prize: number;
  name: string;
  image?: string;
  box_1_text: string;
  box_1_bg_color: string;
  box_1_text_color: string;
  box_2_text?: string;
  box_2_bg_color?: string;
  box_2_text_color?: string;
  inserted_at: number;
  updated_at?: number;
  clubPrizes?: ApiPrizeFromClub[];
}

export interface ApiPrizeFromClub {
  id_club_prize: number;
  club_id: number;
  prize_id: number;
  image?: string;
  box_1_text?: string;
  box_1_bg_color?: string;
  box_1_text_color?: string;
  box_2_text?: string;
  box_2_bg_color?: string;
  box_2_text_color?: string;
  inserted_at: number;
  updated_at?: number;
  club?: ApiClub;
  prize?: ApiPrize;
}

export interface ApiEditionLottery {
  id_lottery: number;
  edition_id: number;
  orderliness: number;
  division_id?: number;
  prize_id?: number;
  total_draws_nr: number;
  inserted_at: number;
  updated_at?: number;
  prize?: ApiPrize;
  division?: ApiDivision;
  luckyOnes?: ApiEditionLuckyOne[];
}

export interface ApiEditionLuckyOne {
  id_lucky_one: number;
  lottery_id: number;
  drawn_participation_id: number;
  drawn_at: number;
  available_at: number;
  announced_at?: number;
  accepted_at?: number;
  rejected_at?: number;
  inserted_at: number;
  updated_at?: number;
  drawnParticipation?: ApiEditionParticipation;
}

export interface ApiPlayerEligibility {
  id_eligibility: number;
  edition_id: number;
  player_id: number;
  name: string;
  phone?: string;
  skill_division?: number;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  year_of_birth?: number;
  being_student: boolean;
  playtomic_id?: string;
  rankedin_id?: string;
  instagram_username?: string;
  facebook_username?: string;
  reviewed_at?: number;
  review_status: 'pending' | 'approved' | 'rejected';
  review_message?: string;
  inserted_at: number;
  updated_at?: number;
  resubmitted_at?: number;
}

export interface ApiMatchesTeam {
  id_team: number;
  player_1: string;
  player_2: string;
  inserted_at: number;
  updated_at?: number;
  player1?: ApiPlayer;
  player2?: ApiPlayer;
}
