/**
 * Shared benefit form constants and helpers.
 */

import {
  ApiBenefitAmountType,
  ApiBenefitCondition,
  ApiBenefitConditionType,
  ApiBenefitDefinition,
  ApiBenefitExclusivity,
  ApiBenefitScopeType,
} from '@/types/api/entities';
import { DropdownOption } from '@/types/ui/dropdowns';

export const BENEFIT_AMOUNT_TYPE_OPTIONS: DropdownOption[] = [
  { label: 'Fixed RON', value: 'fixed_ron' },
  { label: 'Percent', value: 'percent' },
];

export const BENEFIT_SCOPE_TYPE_OPTIONS: DropdownOption[] = [
  { label: 'Lifetime', value: 'lifetime' },
  { label: 'Date range', value: 'date_range' },
  { label: 'Event', value: 'event' },
  { label: 'Club', value: 'club' },
];

export const BENEFIT_EXCLUSIVITY_OPTIONS: DropdownOption[] = [
  { label: 'Stackable', value: 'stackable' },
  { label: 'Exclusive in group', value: 'exclusive_in_group' },
  { label: 'Exclusive global', value: 'exclusive_global' },
];

export const BENEFIT_CONDITION_TYPE_OPTIONS: DropdownOption[] = [
  { label: 'Eligibility flag', value: 'eligibility_flag' },
  { label: 'Days before event date', value: 'days_before_event_date' },
  { label: 'Referrer selected', value: 'referrer_selected' },
  {
    label: 'No prior paid registration in event',
    value: 'no_prior_paid_registration_in_event',
  },
];

export type BenefitFormState = {
  slug: string;
  name: string;
  description: string;
  is_active: boolean;
  amount_type: ApiBenefitAmountType;
  amount_value: string;
  max_discount_ron: string;
  scope_type: ApiBenefitScopeType;
  club_id: number | null;
  valid_from: number | null;
  valid_until: number | null;
  player_optional: boolean;
  stack_group: string;
  exclusivity: ApiBenefitExclusivity;
  priority: string;
  max_redemptions_per_player: string;
  max_redemptions_global: string;
  max_redemptions_per_event: string;
  conditions: ApiBenefitCondition[];
  event_ids: number[];
};

export const EMPTY_BENEFIT_FORM: BenefitFormState = {
  slug: '',
  name: '',
  description: '',
  is_active: false,
  amount_type: 'fixed_ron',
  amount_value: '0',
  max_discount_ron: '',
  scope_type: 'lifetime',
  club_id: null,
  valid_from: null,
  valid_until: null,
  player_optional: true,
  stack_group: '',
  exclusivity: 'stackable',
  priority: '100',
  max_redemptions_per_player: '',
  max_redemptions_global: '',
  max_redemptions_per_event: '',
  conditions: [],
  event_ids: [],
};

export function benefitToFormState(
  benefit: ApiBenefitDefinition
): BenefitFormState {
  return {
    slug: benefit.slug ?? '',
    name: benefit.name ?? '',
    description: benefit.description ?? '',
    is_active: !!benefit.is_active,
    amount_type: (benefit.amount_type as ApiBenefitAmountType) || 'fixed_ron',
    amount_value: String(benefit.amount_value ?? 0),
    max_discount_ron:
      benefit.max_discount_ron != null ? String(benefit.max_discount_ron) : '',
    scope_type: (benefit.scope_type as ApiBenefitScopeType) || 'lifetime',
    club_id: benefit.club_id ?? null,
    valid_from: benefit.valid_from ?? null,
    valid_until: benefit.valid_until ?? null,
    player_optional: benefit.player_optional !== false,
    stack_group: benefit.stack_group ?? '',
    exclusivity:
      (benefit.exclusivity as ApiBenefitExclusivity) || 'stackable',
    priority: String(benefit.priority ?? 100),
    max_redemptions_per_player:
      benefit.max_redemptions_per_player != null
        ? String(benefit.max_redemptions_per_player)
        : '',
    max_redemptions_global:
      benefit.max_redemptions_global != null
        ? String(benefit.max_redemptions_global)
        : '',
    max_redemptions_per_event:
      benefit.max_redemptions_per_event != null
        ? String(benefit.max_redemptions_per_event)
        : '',
    conditions: (benefit.conditions ?? []).map(c => ({
      condition_type: c.condition_type as ApiBenefitConditionType,
      parameters: c.parameters ?? null,
    })),
    event_ids: benefit.event_ids ?? [],
  };
}

function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function formStateToPayload(form: BenefitFormState) {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    is_active: form.is_active,
    amount_type: form.amount_type,
    amount_value: Math.max(0, Math.trunc(Number(form.amount_value) || 0)),
    max_discount_ron: optionalInt(form.max_discount_ron),
    scope_type: form.scope_type,
    club_id: form.scope_type === 'club' ? form.club_id : null,
    valid_from: form.scope_type === 'date_range' ? form.valid_from : null,
    valid_until: form.scope_type === 'date_range' ? form.valid_until : null,
    player_optional: form.player_optional,
    stack_group: form.stack_group.trim() || null,
    exclusivity: form.exclusivity,
    priority: Math.max(0, Math.trunc(Number(form.priority) || 0)),
    max_redemptions_per_player: optionalInt(form.max_redemptions_per_player),
    max_redemptions_global: optionalInt(form.max_redemptions_global),
    max_redemptions_per_event: optionalInt(form.max_redemptions_per_event),
    conditions: form.conditions.map(c => ({
      condition_type: c.condition_type,
      parameters: c.parameters ?? null,
    })),
    event_ids: form.scope_type === 'event' ? form.event_ids : [],
  };
}

export function conditionParametersText(
  condition: ApiBenefitCondition
): string {
  if (!condition.parameters) return '';
  try {
    return JSON.stringify(condition.parameters);
  } catch {
    return '';
  }
}

export function parseConditionParameters(
  text: string
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed) as Record<string, unknown>;
}

export function formatBenefitEffect(
  benefit: Pick<ApiBenefitDefinition, 'amount_type' | 'amount_value'>
): string {
  if (benefit.amount_type === 'percent') {
    return `${benefit.amount_value}%`;
  }
  return `${benefit.amount_value} RON`;
}
