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
  show_event_label?: boolean;
  inserted_at: number;
  updated_at?: number;
}

/** Seeded, read-only player level band. Numerically lower = stronger. */
export interface ApiLevel {
  id_level: number;
  name: string;
  /** Weakest value of the band (numerically the larger one), 2 decimals. */
  level_min: string;
  /** Strongest value of the band (numerically the smaller one), 2 decimals. */
  level_max: string;
  inserted_at?: number;
  updated_at?: number | null;
}

export type ApiReviewStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'discarded';

export interface ApiPlayerLevel {
  id_player_level: number;
  player_id: number;
  level: string;
  band_name?: string | null;
  player_level_assessment_id?: number | null;
  event_participation_id?: number | null;
  inserted_at?: number;
  updated_at?: number | null;
}

export interface ApiPlayerLevelAssessmentSubmission {
  id_player_custom_field_submission: number;
  player_id: number;
  submitted_via?: string | null;
  submitted_by_player_id?: number | null;
  inserted_at?: number;
  values?: ApiPlayerCustomFieldValue[] | null;
}

export interface ApiPlayerLevelAssessment {
  id_player_level_assessment: number;
  player_id: number;
  player_custom_field_submission_id: number;
  submitted_at?: number | null;
  resubmitted_at?: number | null;
  ready_for_review: boolean;
  reviewed_at?: number | null;
  review_status: ApiReviewStatus;
  review_message?: string | null;
  inserted_at: number;
  updated_at?: number | null;
  player?: ApiPlayer;
  submission?: ApiPlayerLevelAssessmentSubmission;
  player_level?: ApiPlayerLevel | null;
  profile_images?: Array<{ url?: string | null; [key: string]: unknown }>;
}

export interface ApiPlayerStudentProofFile {
  id_player_student_proof_file: number;
  student_proof_id: number;
  sort_order: number;
  url: string;
  inserted_at: number;
  updated_at?: number | null;
}

export interface ApiPlayerStudentProof {
  id_player_student_proof: number;
  player_id: number;
  student_until: string | null;
  sort_order?: number;
  ready_for_review: boolean;
  review_status: ApiReviewStatus;
  review_message?: string | null;
  submitted_at?: number | null;
  reviewed_at?: number | null;
  /** Up to 3 uploaded files (players upload; Manager only views). */
  files?: ApiPlayerStudentProofFile[];
  inserted_at: number;
  updated_at?: number | null;
  player?: ApiPlayer;
}

export interface ApiDivision {
  id_division: number;
  name: string;
  color: string;
  is_students_only?: boolean;
  its_first_event_id: number;
  /** Weakest accepted level; editable independently of `levels`. */
  level_min?: string | null;
  /** Strongest accepted level; editable independently of `levels`. */
  level_max?: string | null;
  levels?: ApiLevel[];
  /** Write-only: M2M band ids synced by the API. */
  level_ids?: number[];
  inserted_at: number;
  updated_at?: number;
}

export interface ApiEvent {
  id_event: number;
  location_id: number;
  organizer_id?: number | null;
  include_club_host_on_pdf?: boolean;
  name: string;
  /** Server-generated; read-only — never sent on create/update. */
  slug?: string | null;
  date: string;
  arriving_time?: string;
  closing_time?: string;
  finalized_at?: number | null;
  /** Unix timestamp until which players may register for this event. */
  registration_allowed_until: number;
  /** Unix timestamp until which players may self-cancel their registration. */
  cancellation_allowed_until: number;
  inserted_at: number;
  updated_at?: number;
  location?: ApiLocation;
  organizer?: ApiOrganizer | null;
  divisions?: ApiEventDivision[];
  event_divisions?: ApiEventDivision[];
  participations?: ApiEventParticipation[];
}

/**
 * Identity only. Schedule knobs live on ApiEventDivisionSchedule.
 */
export interface ApiEventDivision {
  id_event_division: number;
  event_id: number;
  division_id: number;
  division_title?: string;
  players_limit: number | null;
  /** Entry fee in RON for this event–division pairing. */
  entry_fee?: number;
  skill_order?: number;
  /** Weakest level accepted in this event division (2 decimals). */
  level_min?: string | null;
  /** Strongest level accepted in this event division (2 decimals). */
  level_max?: string | null;
  playing_start_time: string;
  playing_end_time: string;
  inserted_at: number;
  updated_at?: number;
  event?: ApiEvent;
  division?: ApiDivision;
  courts?: { id_court: number; name: string; location_id?: number }[];
  schedule?: ApiEventDivisionSchedule | null;
}

export interface ApiEventDivisionSchedule {
  id_event_division_schedule: number;
  event_division_id: number;
  player_opponents_nr?: number | null;
  player_matches_repeat?: number | null;
  include_scores: boolean;
  has_demonstrative_match: boolean;
  allow_replacements: boolean;
  points_per_match?: number | null;
  points_per_match_print?: number | null;
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

/** Cached circular PDF avatar of a player (one row per `is_collecting_points` variant). */
export interface ApiCachedPdfPlayerImage {
  id_cached_pdf_player_image: number;
  player_is_collecting_points: boolean;
  url: string | null;
  updated_at?: number | null;
}

export type ApiPlayerContactPurpose = 'contact' | 'login';

export interface ApiPlayerPhone {
  id_player_phone: number;
  player_id: number;
  phone: string;
  purposes: ApiPlayerContactPurpose[];
  is_primary: boolean;
  verified_at?: number | null;
  inserted_at: number;
  updated_at?: number | null;
}

export interface ApiPlayerEmail {
  id_player_email: number;
  player_id: number;
  email: string;
  purposes: ApiPlayerContactPurpose[];
  is_primary: boolean;
  verified_at?: number | null;
  inserted_at: number;
  updated_at?: number | null;
}

export type ApiPlayerIdentityProvider = 'google' | 'apple' | 'sms' | 'dev';

export interface ApiPlayerIdentity {
  id_identity: number;
  player_id: number;
  provider: ApiPlayerIdentityProvider;
  provider_subject: string;
  email_id?: number | null;
  phone_id?: number | null;
  display_name?: string | null;
  avatar_url?: string | null;
  is_avatar_primary: boolean;
  linked_at: number;
  last_login_at?: number | null;
  inserted_at: number;
  updated_at?: number | null;
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
  /** Only on the Manager player show payload; one row per `is_collecting_points` variant that is cached. */
  cached_pdf_images?: ApiCachedPdfPlayerImage[];
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
  participations?: ApiEventParticipation[];
}

export interface ApiEventParticipation {
  id_participation: number;
  event_id: number;
  player_id: number;
  event_division_id?: number;
  division_id: number;
  sort_order?: number;
  is_collecting_points?: boolean;
  pdf_avatar_url?: string | null;
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
      division_color: string;
      rank: number | null;
      participant_count: number;
    } | null;
    participated_count: number;
    banned_count: number;
    absented_count: number;
    played_recent?: Array<{
      event_name: string;
      division_title: string;
      division_color: string;
      rank: number | null;
      participant_count: number;
      date: string;
    }>;
    participated_tooltip?: {
      lines: Array<
        | { type: 'entry'; event_name: string; date: string }
        | { type: 'ellipsis' }
      >;
    };
    banned_recent?: Array<{
      event_name: string;
      date: string;
      ban_reason: string;
    }>;
    absented_recent?: Array<{
      event_name: string;
      date: string;
      absence_reason: string;
    }>;
  };
  flags?: string[];
  custom_field_values?: Array<{
    field_id: number;
    label: string;
    value: string;
    recent_answers?: Array<{
      value: string;
      event_name: string | null;
      inserted_date: string;
    }>;
  }>;
}

export interface ApiEventParticipationSummary {
  registered_not_participating_count: number;
  participations_locked: boolean;
}

export type ApiRegistrationLifecycleStatus =
  | 'active'
  | 'cancelled'
  | 'declined';

export type ApiRegistrationPaymentStatus =
  | 'unpaid'
  | 'awaiting_proof_review'
  | 'paid'
  | 'refund_pending'
  | 'refunded';

export type ApiRegistrationPaymentMethod = 'netopia' | 'bank_transfer';

export type ApiRegistrationCancelReason =
  | 'change_of_plans'
  | 'schedule_conflict'
  | 'injury_or_illness'
  | 'travel_issue'
  | 'personal_reasons'
  | 'other';

export type ApiRegistrationDeclineReason =
  | 'payment_not_completed'
  | 'invalid_payment'
  | 'ineligible'
  | 'skill_mismatch'
  | 'false_information'
  | 'misconduct'
  | 'administrative'
  | 'other';

export type ApiPaymentProofReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ApiRegistrationPaymentProof {
  id_payment_proof: number;
  url: string;
  review_status: ApiPaymentProofReviewStatus;
  review_message?: string | null;
  reviewed_at?: number | null;
  inserted_at: number;
}

export interface ApiRegistrationPaymentAttempt {
  id_payment_attempt: number;
  amount: number;
  currency: string;
  status: string;
  ntp_id?: string | null;
  order_id?: string | null;
  redirect_url?: string | null;
  error_message?: string | null;
  inserted_at: number;
}

export type ApiBenefitAmountType = 'fixed_ron' | 'percent';

export type ApiBenefitScopeType =
  | 'lifetime'
  | 'date_range'
  | 'event'
  | 'club';

export type ApiBenefitExclusivity =
  | 'stackable'
  | 'exclusive_in_group'
  | 'exclusive_global';

export type ApiBenefitConditionType =
  | 'student_proof_active'
  | 'days_before_event_date'
  | 'referrer_selected'
  | 'no_prior_paid_registration_in_event';

export type ApiBenefitEntitlementStatus =
  | 'active'
  | 'consumed'
  | 'expired'
  | 'revoked';

export type ApiBenefitEntitlementSourceType =
  | 'manager_grant'
  | 'referral_reward'
  | 'system';

export type ApiBenefitSelectionSource =
  | 'auto'
  | 'player'
  | 'manager'
  | 'system';

export interface ApiBenefitCondition {
  id_benefit_condition?: number;
  condition_type: ApiBenefitConditionType | string;
  parameters?: Record<string, unknown> | null;
}

export interface ApiBenefitDefinition {
  id_benefit: number;
  slug: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  is_system?: boolean;
  amount_type: ApiBenefitAmountType | string;
  amount_value: number;
  max_discount_ron?: number | null;
  scope_type: ApiBenefitScopeType | string;
  club_id?: number | null;
  valid_from?: number | null;
  valid_until?: number | null;
  player_optional?: boolean;
  stack_group?: string | null;
  exclusivity: ApiBenefitExclusivity | string;
  priority?: number;
  max_redemptions_per_player?: number | null;
  max_redemptions_global?: number | null;
  max_redemptions_per_event?: number | null;
  conditions?: ApiBenefitCondition[];
  event_ids?: number[];
  inserted_at: number;
  updated_at?: number;
}

export interface ApiBenefitEntitlement {
  id_entitlement: number;
  benefit_definition_id: number;
  player_id: number;
  remaining_uses?: number | null;
  valid_from?: number | null;
  valid_until?: number | null;
  source_type: ApiBenefitEntitlementSourceType | string;
  source_id?: number | null;
  status: ApiBenefitEntitlementStatus | string;
  benefit_definition?: ApiBenefitDefinition | null;
  player?: ApiPlayer | null;
  inserted_at: number;
  updated_at?: number;
}

export interface ApiBenefitRedemption {
  id_redemption: number;
  benefit_definition_id?: number | null;
  benefit_name?: string | null;
  amount_ron: number;
  selection_source?: ApiBenefitSelectionSource | string | null;
  reason?: string | null;
}

export interface ApiEventReferralSetting {
  id_event_referral_setting?: number | null;
  event_id: number;
  code_ttl_hours: number;
  inserted_at?: number | null;
  updated_at?: number | null;
}

export interface ApiReferralTouchpoint {
  id_touchpoint: number;
  event_id: number;
  referred_player_id: number;
  referrer_player_id: number;
  referral_code_id?: number | null;
  discount_eligible: boolean;
  touched_at?: number | null;
  client_metadata?: Record<string, unknown> | null;
  referred_player?: ApiPlayer | null;
  referrer_player?: ApiPlayer | null;
  inserted_at: number;
  updated_at?: number;
}

export type ApiReferralAttributionStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'expired';

export interface ApiReferralAttribution {
  id_attribution: number;
  event_id: number;
  referred_player_id: number;
  referrer_player_id: number;
  referral_code_id?: number | null;
  checkout_id?: number | null;
  status: ApiReferralAttributionStatus | string;
  referred_player?: ApiPlayer | null;
  referrer_player?: ApiPlayer | null;
  inserted_at: number;
  updated_at?: number;
}

export interface ApiPricingPreviewQuote {
  payment?: number;
  amount_due?: number;
  redemptions?: ApiBenefitRedemption[];
  [key: string]: unknown;
}

export interface ApiEventRegistration {
  id_registration: number;
  event_id: number;
  player_id: number;
  event_division_id?: number | null;
  /** Latest checkout that includes this registration line. */
  checkout_id?: number | null;
  is_minor: boolean;
  is_student: boolean;
  payment: number;
  /** Server-computed payable after redemptions, floored at 0. */
  amount_due?: number;
  payment_due_at?: number | null;
  is_overdue?: boolean;
  lifecycle_status?: ApiRegistrationLifecycleStatus;
  payment_status?: ApiRegistrationPaymentStatus;
  payment_method?: ApiRegistrationPaymentMethod | null;
  paid_at?: number | null;
  cancelled_at?: number | null;
  declined_at?: number | null;
  cancel_reason?: ApiRegistrationCancelReason | null;
  decline_reason?: ApiRegistrationDeclineReason | null;
  redemptions?: ApiBenefitRedemption[];
  inserted_at: number;
  updated_at?: number;
  player?: ApiPlayer;
  event?: ApiEvent;
  event_division?: ApiEventDivision | null;
  payment_proofs?: ApiRegistrationPaymentProof[];
  payment_attempts?: ApiRegistrationPaymentAttempt[];
}

export type ApiCheckoutStatus = 'open' | 'awaiting_proof' | 'completed';

export type ApiCheckoutItemStatus = 'active' | 'cancelled';

export interface ApiEventRegistrationCheckoutItem {
  id_checkout_item: number;
  registration_id: number;
  amount: number;
  item_status: ApiCheckoutItemStatus | string;
  registration?: ApiEventRegistration | null;
}

export interface ApiEventRegistrationCheckoutProof {
  id_payment_proof: number;
  url: string;
  review_status: ApiPaymentProofReviewStatus | string;
  review_message?: string | null;
  reviewed_at?: number | null;
}

export interface ApiEventRegistrationCheckoutAttempt {
  id_payment_attempt: number;
  amount: number;
  status: string;
  order_id?: string | null;
  ntp_id?: string | null;
  redirect_url?: string | null;
  inserted_at?: number;
}

/** Checkout-centric payment ops queue row (manager registration-checkouts). */
export interface ApiEventRegistrationCheckout {
  id_checkout: number;
  event_id: number;
  player_id: number;
  status: ApiCheckoutStatus | string;
  total_amount: number;
  payment_method?: ApiRegistrationPaymentMethod | null;
  paid_at?: number | null;
  inserted_at: number;
  updated_at?: number;
  player?: ApiPlayer;
  event?: ApiEvent;
  items?: ApiEventRegistrationCheckoutItem[];
  payment_attempts?: ApiEventRegistrationCheckoutAttempt[];
  payment_proofs?: ApiEventRegistrationCheckoutProof[];
  latest_attempt?: ApiEventRegistrationCheckoutAttempt | null;
}

export interface ApiBankTransferSettings {
  id_bank_transfer_settings: number;
  iban: string;
  beneficiary_name: string;
  bank_name?: string | null;
  payment_reference_template?: string | null;
  extra_instructions?: string | null;
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
  lottery_prizes?: ApiEventLotteryPrize[];
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

export interface ApiEventLotteryPrize {
  id_lottery_prize: number;
  lottery_id: number;
  prize_id: number;
  prize_quantity: number;
  sponsor_id?: number | null;
  display_order?: number | null;
  inserted_at: number;
  updated_at?: number;
  lottery?: ApiEventLottery;
  prize?: ApiPrize;
  sponsor?: ApiSponsor | null;
  rules?: unknown[];
  luckies?: ApiEventLuckyOne[];
  rules_count?: number;
  rule_prize_quantity_total?: number;
  activity_at?: number | null;
}

export interface ApiEventLottery {
  id_lottery: number;
  event_id: number;
  name: string;
  display_order?: number | null;
  inserted_at: number;
  updated_at?: number;
  event?: ApiEvent;
  lottery_prizes?: ApiEventLotteryPrize[];
  rules?: unknown[];
  luckies?: ApiEventLuckyOne[];
  has_luckies?: boolean;
}

export interface ApiEventLuckyOne {
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
    event_division_id?: number | null;
    [key: string]: unknown;
  };
  drawnParticipation?: ApiEventParticipation;
  drawn_participation?: ApiEventParticipation;
  short_name?: string | null;
  pdf_avatar_url?: string | null;
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

export interface ApiEventRegistrationImportPreviewRow
  extends ApiPlayerImportPreviewRow {
  already_registered: boolean;
}

export interface ApiEventRegistrationImportResultRow {
  index: number;
  player_id: number | null;
  action: string;
  registration_id: number | null;
}

export interface ApiEventRegistrationImportResult {
  registered: number;
  skipped_already_registered: number;
  skipped_unmapped: number;
  skipped_conflict: number;
  rows: ApiEventRegistrationImportResultRow[];
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
  | 'multi_select'
  | 'json';

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

export type PlayerCustomFieldValueReviewStatus =
  | 'pending'
  | 'validated'
  | 'rejected'
  | 'discarded';

export interface ApiPlayerCustomFieldValue {
  id_player_custom_field_value: number;
  player_id: number;
  player_custom_field_id: number;
  event_id?: number | null;
  value_text?: string | null;
  value_integer?: number | null;
  value_boolean?: boolean | null;
  value_date?: string | null;
  value_json?: unknown;
  value?: unknown;
  submitted_by_player_id?: number | null;
  submitted_via: 'manager' | 'csv';
  created_via_import_id?: number | null;
  /** `validated` is the current/authoritative value; others are history. */
  review_status: PlayerCustomFieldValueReviewStatus;
  reviewed_at?: number | null;
  reviewed_by_manager_id?: number | null;
  inserted_at: number;
  updated_at?: number;
  field?: ApiPlayerCustomField;
  event?: ApiEvent;
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
  event_id?: number | null;
  included_count: number;
  values_new_count: number;
  values_replaced_count: number;
  inserted_at: number;
  updated_at?: number;
  importedByPlayer?: ApiPlayer | null;
  event?: ApiEvent | null;
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
