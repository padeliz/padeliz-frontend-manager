/**
 * API Entity Types
 * Core business entities from the backend API
 */

export interface ApiClub {
  id_club: number;
  name: string;
  city: string;
  logo_path?: string | null;
  url?: string | null;
  inserted_at: number;
  updated_at?: number;
  locations?: ApiLocation[];
}

export interface ApiOrganizer {
  id_organizer: number;
  name: string;
  logo_path?: string | null;
  url?: string | null;
  show_edition_label?: boolean;
  inserted_at: number;
  updated_at?: number;
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
  organizer_id?: number | null;
  include_club_host_on_pdf?: boolean;
  name: string;
  date: string;
  entry_fee?: number;
  students_entry_fee?: number;
  arriving_time?: string;
  closing_time?: string;
  finalized_at?: number | null;
  inserted_at: number;
  updated_at?: number;
  location?: ApiLocation;
  organizer?: ApiOrganizer | null;
  divisions?: ApiEditionDivision[];
  edition_divisions?: ApiEditionDivision[];
  participations?: ApiEditionParticipation[];
}

/**
 * Identity only. Schedule knobs live on ApiEditionDivisionSchedule.
 */
export interface ApiEditionDivision {
  id_edition_division: number;
  edition_id: number;
  division_id: number;
  division_title?: string;
  players_limit: number;
  skill_order?: number;
  playing_start_time: string;
  playing_end_time: string;
  inserted_at: number;
  updated_at?: number;
  edition?: ApiEdition;
  division?: ApiDivision;
  courts?: { id_court: number; name: string; location_id?: number }[];
  schedule?: ApiEditionDivisionSchedule | null;
}

export interface ApiEditionDivisionSchedule {
  id_edition_division_schedule: number;
  edition_division_id: number;
  player_opponents_nr?: number | null;
  player_matches_repeat?: number | null;
  include_scores: boolean;
  has_demonstrative_match: boolean;
  allow_replacements: boolean;
  points_per_match?: number | null;
  final_points_target?: number;
  include_final: boolean;
  template_version?: number | null;
  adjust?: number;
  inserted_at: number;
  updated_at?: number;
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
  created_via?: 'app' | 'manager' | 'csv' | null;
  created_via_format?: string | null;
  created_via_import_id?: number | null;
  pdf_avatar_url?: string | null;
  profile_image_url?: string | null;
  emails?: { id_player_email: number; email: string; purposes?: string[]; is_primary?: boolean }[];
  phones?: { id_player_phone: number; phone: string; purposes?: string[]; is_primary?: boolean }[];
  inserted_at: number;
  updated_at?: number;
  uploaded_profile_images?: {
    id: number;
    url: string;
    is_pdf_primary?: boolean;
    uploaded_via?: string | null;
    uploaded_via_import_id?: number | null;
    original_filename?: string | null;
  }[];
  uploaded_profile_urls?: string[];
  participations?: ApiEditionParticipation[];
}

export interface ApiEditionParticipation {
  id_participation: number;
  edition_id: number;
  player_id: number;
  edition_division_id?: number;
  division_id: number;
  sort_order?: number;
  is_collecting_points?: boolean;
  absence_reason?: 'SICK' | 'FORGOT' | 'EXAMS' | 'RECONSIDERED';
  ban_reason?: 'LEFT SUDDENLY' | 'AGGRESSIVE PLAYER' | 'LIBIDINOUS' | '';
  inserted_at: number;
  updated_at?: number;
  player?: ApiPlayer;
  division?: ApiDivision;
  player_history?: {
    last_played: {
      division_id?: number;
      division_title: string;
      rank: number | null;
      participant_count: number;
    } | null;
    participated_count: number;
    banned_count: number;
    absented_count: number;
  };
  flags?: string[];
  custom_field_values?: Array<{
    field_id: number;
    label: string;
    value: string;
  }>;
}

export interface ApiEditionParticipationSummary {
  registered_not_participating_count: number;
  participations_locked: boolean;
}

export interface ApiEditionRegistration {
  id_registration: number;
  edition_id: number;
  player_id: number;
  edition_division_id?: number | null;
  is_minor: boolean;
  is_student: boolean;
  discount?: number;
  payment: number;
  inserted_at: number;
  updated_at?: number;
  player?: ApiPlayer;
  edition?: ApiEdition;
  edition_division?: ApiEditionDivision | null;
}

export interface ApiPrize {
  id_prize: number;
  name: string;
  media_path?: string;
  url?: string;
  template?: string;
  box_1_text: string;
  box_1_bg_color: string;
  box_1_text_color: string;
  box_2_text?: string;
  box_2_bg_color?: string;
  box_2_text_color?: string;
  inserted_at: number;
  updated_at?: number;
  sponsor_prizes?: ApiSponsorPrize[];
  lottery_prizes?: ApiEditionLotteryPrize[];
}

export interface ApiSponsor {
  id_sponsor: number;
  name: string;
  club_id?: number | null;
  player_ids?: number[];
  inserted_at: number;
  updated_at?: number;
  club?: ApiClub;
  players?: ApiPlayer[];
  sponsor_prizes?: ApiSponsorPrize[];
}

export interface ApiSponsorPrize {
  id_sponsor_prize: number;
  sponsor_id: number;
  prize_id: number;
  media_path?: string;
  url?: string;
  template?: string;
  box_1_text?: string;
  box_1_bg_color?: string;
  box_1_text_color?: string;
  box_2_text?: string;
  box_2_bg_color?: string;
  box_2_text_color?: string;
  inserted_at: number;
  updated_at?: number;
  sponsor?: ApiSponsor;
  prize?: ApiPrize;
}

export interface ApiEditionLotteryPrize {
  id_lottery_prize: number;
  lottery_id: number;
  prize_id: number;
  prize_quantity: number;
  sponsor_id?: number | null;
  display_order?: number | null;
  inserted_at: number;
  updated_at?: number;
  lottery?: ApiEditionLottery;
  prize?: ApiPrize;
  sponsor?: ApiSponsor | null;
  rules?: unknown[];
  luckies?: ApiEditionLuckyOne[];
  rule_prize_quantity_total?: number;
  activity_at?: number | null;
}

export interface ApiEditionLottery {
  id_lottery: number;
  edition_id: number;
  name: string;
  display_order?: number | null;
  inserted_at: number;
  updated_at?: number;
  edition?: ApiEdition;
  lottery_prizes?: ApiEditionLotteryPrize[];
  rules?: unknown[];
  luckies?: ApiEditionLuckyOne[];
}

export interface ApiEditionLuckyOne {
  id_lucky: number;
  lottery_rule_id?: number | null;
  drawn_participation_id: number;
  drawn_at: number;
  available_at: number;
  announced_at?: number | null;
  accepted_at?: number | null;
  rejected_at?: number | null;
  inserted_at: number;
  updated_at?: number;
  lotteryRule?: unknown;
  lottery_rule?: {
    id_lottery_rule?: number;
    edition_division_id?: number | null;
    [key: string]: unknown;
  };
  drawnParticipation?: ApiEditionParticipation;
  drawn_participation?: ApiEditionParticipation;
  short_name?: string | null;
  pdf_avatar_url?: string | null;
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

export interface ApiPlayerImportRow {
  id_player_import_row: number;
  player_import_id: number;
  row_index: number;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  player_id?: number | null;
  action: 'created' | 'attached';
  inserted_at: number;
  updated_at?: number;
}

export interface ApiPlayerImport {
  id_player_import: number;
  imported_by_player_id?: number | null;
  format: string;
  original_filename: string;
  included_count: number;
  created_count: number;
  attached_count: number;
  inserted_at: number;
  updated_at?: number;
  importedByPlayer?: ApiPlayer | null;
  rows?: ApiPlayerImportRow[];
}

export interface ApiPlayerImportPreviewMapping {
  status: 'mapped' | 'unmapped' | 'conflict';
  matched_by: 'email' | 'phone' | null;
  player: ApiPlayer | null;
  candidates: ApiPlayer[];
  name_matches: ApiPlayer[];
}

export interface ApiPlayerImportPreviewRow {
  index: number;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  phone: string;
  mapping: ApiPlayerImportPreviewMapping;
}

export interface ApiEditionRegistrationImportPreviewRow
  extends ApiPlayerImportPreviewRow {
  already_registered: boolean;
}

export interface ApiEditionRegistrationImportResultRow {
  index: number;
  player_id: number | null;
  action: string;
  registration_id: number | null;
}

export interface ApiEditionRegistrationImportResult {
  registered: number;
  skipped_already_registered: number;
  skipped_unmapped: number;
  skipped_conflict: number;
  rows: ApiEditionRegistrationImportResultRow[];
}

export interface ApiPlayerProfileImageImportRow {
  id_player_profile_image_import_row: number;
  player_profile_image_import_id: number;
  row_index: number;
  original_filename: string;
  player_id: number;
  player_profile_image_id: number;
  is_pdf_primary: boolean;
  action: 'uploaded';
  inserted_at: number;
  updated_at?: number;
}

export interface ApiPlayerProfileImageImport {
  id_player_profile_image_import: number;
  imported_by_player_id?: number | null;
  original_filename: string;
  included_count: number;
  uploaded_count: number;
  inserted_at: number;
  updated_at?: number;
  importedByPlayer?: ApiPlayer | null;
  rows?: ApiPlayerProfileImageImportRow[];
}

export interface ApiPlayerProfileImageImportPreviewMapping {
  status: 'mapped' | 'unmapped';
  matched_by: 'email' | 'phone' | 'id' | null;
  player: ApiPlayer | null;
  candidates: ApiPlayer[];
  name_matches: ApiPlayer[];
}

export interface ApiPlayerProfileImageImportPreviewRow {
  index: number;
  filename: string;
  mapping: ApiPlayerProfileImageImportPreviewMapping;
}

export type ApiPlayerCustomFieldType =
  | 'text'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'single_select'
  | 'multi_select';

export interface ApiPlayerCustomFieldOption {
  id_player_custom_field_option: number;
  player_custom_field_id: number;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  inserted_at: number;
  updated_at?: number;
}

export interface ApiPlayerCustomField {
  id_player_custom_field: number;
  code: string;
  label: string;
  help_text?: string | null;
  sort_order: number;
  type: ApiPlayerCustomFieldType;
  rules_json?: Record<string, unknown> | null;
  is_required: boolean;
  archived_at?: number | null;
  inserted_at: number;
  updated_at?: number;
  options?: ApiPlayerCustomFieldOption[];
}

export interface ApiPlayerCustomFieldValueOption {
  id_player_custom_field_value_option: number;
  player_custom_field_value_id: number;
  option_id: number;
  option_label_snapshot: string;
  inserted_at: number;
  updated_at?: number;
}

export interface ApiPlayerCustomFieldValue {
  id_player_custom_field_value: number;
  player_id: number;
  player_custom_field_id: number;
  edition_id?: number | null;
  value_text?: string | null;
  value_integer?: number | null;
  value_boolean?: boolean | null;
  value_date?: string | null;
  value?: unknown;
  submitted_by_player_id?: number | null;
  submitted_via: 'manager' | 'csv';
  created_via_import_id?: number | null;
  invalidated_at?: number | null;
  invalidated_by_player_id?: number | null;
  invalidation_reason?: string | null;
  inserted_at: number;
  updated_at?: number;
  field?: ApiPlayerCustomField;
  edition?: ApiEdition;
  selected_options?: ApiPlayerCustomFieldValueOption[];
}

export interface ApiPlayerCustomFieldValueImportRow {
  id_player_custom_field_value_import_row: number;
  player_custom_field_value_import_id: number;
  row_index: number;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  player_id: number;
  action: 'imported';
  answers_json: Record<string, string>;
  inserted_at: number;
  updated_at?: number;
  player?: ApiPlayer;
}

export interface ApiPlayerCustomFieldValueImport {
  id_player_custom_field_value_import: number;
  imported_by_player_id?: number | null;
  format: string;
  original_filename: string;
  edition_id?: number | null;
  included_count: number;
  values_new_count: number;
  values_replaced_count: number;
  inserted_at: number;
  updated_at?: number;
  importedByPlayer?: ApiPlayer | null;
  edition?: ApiEdition | null;
  rows?: ApiPlayerCustomFieldValueImportRow[];
}

export interface ApiPlayerCustomFieldValueImportPreviewMapping {
  status: 'mapped' | 'unmapped' | 'conflict';
  matched_by: 'email' | 'phone' | null;
  player: ApiPlayer | null;
  candidates: ApiPlayer[];
  name_matches: ApiPlayer[];
}

export interface ApiPlayerCustomFieldValueImportPreviewRow {
  index: number;
  full_name: string;
  email: string;
  phone: string;
  answers: Record<string, string>;
  included: boolean;
  mapping: ApiPlayerCustomFieldValueImportPreviewMapping;
}
