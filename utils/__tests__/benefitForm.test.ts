/**
 * @jest-environment jsdom
 */
import { formStateToPayload, formatBenefitEffect } from '@/utils/benefitForm';
import { EMPTY_BENEFIT_FORM } from '@/utils/benefitForm';

describe('benefitForm helpers', () => {
  it('formats fixed and percent effects', () => {
    expect(
      formatBenefitEffect({ amount_type: 'fixed_ron', amount_value: 15 })
    ).toBe('15 RON');
    expect(
      formatBenefitEffect({ amount_type: 'percent', amount_value: 10 })
    ).toBe('10%');
  });

  it('maps form state to API payload for event scope', () => {
    const payload = formStateToPayload({
      ...EMPTY_BENEFIT_FORM,
      slug: 'early-bird',
      name: 'Early bird',
      amount_type: 'fixed_ron',
      amount_value: '15',
      scope_type: 'event',
      exclusivity: 'stackable',
      event_ids: [1, 2],
      club_id: 9,
      conditions: [
        { condition_type: 'days_before_event_date', parameters: { min: 7 } },
      ],
    });
    expect(payload.slug).toBe('early-bird');
    expect(payload.amount_value).toBe(15);
    expect(payload.event_ids).toEqual([1, 2]);
    expect(payload.club_id).toBeNull();
    expect(payload.conditions).toEqual([
      { condition_type: 'days_before_event_date', parameters: { min: 7 } },
    ]);
  });
});
