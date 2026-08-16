import {
  canConfirmReplaceSchedule,
  flattenMatchesByCourt,
  generateBlockedReason,
  isGenerateBlocked,
} from '@/utils/edition/schedulePreview';

describe('flattenMatchesByCourt', () => {
  it('flattens nested court arrays', () => {
    const nested = [
      [
        { side_a: [1, 2], side_b: [3, 4], court_name: 'A' },
        { side_a: [5, 6], side_b: [7, 8], court_name: 'A' },
      ],
      [{ side_a: [9, 10], side_b: [11, 12], court_name: 'B' }],
    ];
    const flat = flattenMatchesByCourt(nested as any);
    expect(flat).toHaveLength(3);
    expect(flat[0].side_a).toEqual([1, 2]);
    expect(flat[2].court_name).toBe('B');
    expect(flat[2].court_index).toBe(1);
  });

  it('passes through already-flat matches', () => {
    const flatIn = [
      { side_a: [1, 2], side_b: [3, 4], court_name: 'Court 1' },
    ];
    expect(flattenMatchesByCourt(flatIn)).toEqual(flatIn);
  });

  it('flattens object keyed by court index', () => {
    const keyed = {
      '0': [{ side_a: [1, 2], side_b: [3, 4] }],
      '1': [{ side_a: [5, 6], side_b: [7, 8] }],
    };
    const flat = flattenMatchesByCourt(keyed as any);
    expect(flat).toHaveLength(2);
    expect(flat[1].court_index).toBe(1);
  });

  it('returns empty for nullish', () => {
    expect(flattenMatchesByCourt(undefined)).toEqual([]);
  });
});

describe('generate gates', () => {
  it('blocks generate when scores, standings, or finalized', () => {
    expect(isGenerateBlocked({ has_scores: true })).toBe(true);
    expect(isGenerateBlocked({ has_standings: true })).toBe(true);
    expect(isGenerateBlocked({ is_finalized: true })).toBe(true);
    expect(isGenerateBlocked({})).toBe(false);
  });

  it('returns blocked reason for each gate', () => {
    expect(generateBlockedReason({ has_scores: true })).toMatch(/scores/i);
    expect(generateBlockedReason({ has_standings: true })).toMatch(/standings/i);
    expect(generateBlockedReason({ is_finalized: true })).toMatch(/finalized/i);
    expect(generateBlockedReason({})).toBeNull();
  });

  it('allows confirm_replace only for empty replaceable schedule', () => {
    expect(
      canConfirmReplaceSchedule({
        has_regular_matches: true,
        has_scores: false,
        has_standings: false,
        is_finalized: false,
      })
    ).toBe(true);
    expect(
      canConfirmReplaceSchedule({
        has_regular_matches: true,
        has_scores: true,
      })
    ).toBe(false);
    expect(canConfirmReplaceSchedule({ has_regular_matches: false })).toBe(
      false
    );
  });
});
