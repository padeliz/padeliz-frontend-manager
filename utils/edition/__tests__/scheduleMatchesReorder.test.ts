import {
  applyCourtPermutation,
  completeRoundCount,
  diffMovedAndAffected,
  isSparseMatch,
  swapCompleteRound,
} from '@/utils/edition/scheduleMatchesReorder';
import { GameMatch } from '@/types/api/edition';

function match(
  id: number,
  courtId: number,
  seq: number,
  start: string,
  end: string
): GameMatch {
  return {
    id_match: id,
    match_kind: 'REGULAR',
    edition_division_court_id: courtId,
    sequence_no: seq,
    scheduled_start: start,
    scheduled_end: end,
  };
}

/** Two courts, 3 complete rounds each + 1 sparse on court A */
function baselineTwoCourts(): GameMatch[] {
  return [
    match(1, 10, 1, '10:00:00', '10:30:00'),
    match(2, 10, 2, '10:30:00', '11:00:00'),
    match(3, 10, 3, '11:00:00', '11:30:00'),
    match(4, 10, 4, '11:30:00', '12:00:00'), // sparse
    match(11, 20, 1, '10:00:00', '10:30:00'),
    match(12, 20, 2, '10:30:00', '11:00:00'),
    match(13, 20, 3, '11:00:00', '11:30:00'),
  ];
}

describe('scheduleMatchesReorder helpers', () => {
  it('completeRoundCount / isSparseMatch', () => {
    const matches = baselineTwoCourts();
    expect(completeRoundCount(matches)).toBe(3);
    expect(isSparseMatch(matches[3], 3)).toBe(true);
    expect(isSparseMatch(matches[0], 3)).toBe(false);
  });

  it('applyCourtPermutation syncs other courts and leaves sparse + times', () => {
    const baseline = baselineTwoCourts();
    // Swap first two on court 10: [2,1,3]
    const next = applyCourtPermutation(baseline, 10, [2, 1, 3]);

    const byId = Object.fromEntries(next.map(m => [m.id_match, m]));
    expect(byId[2].sequence_no).toBe(1);
    expect(byId[1].sequence_no).toBe(2);
    expect(byId[3].sequence_no).toBe(3);
    // Other court synced by old-index remapping: old 0→1, old 1→0, old 2→2
    expect(byId[12].sequence_no).toBe(1);
    expect(byId[11].sequence_no).toBe(2);
    expect(byId[13].sequence_no).toBe(3);
    // Sparse stays last
    expect(byId[4].sequence_no).toBe(4);
    // Times unchanged
    for (const m of baseline) {
      expect(byId[m.id_match].scheduled_start).toBe(m.scheduled_start);
      expect(byId[m.id_match].scheduled_end).toBe(m.scheduled_end);
    }
  });

  it('diffMovedAndAffected: touched moved, synced others affected, sparse neither', () => {
    const baseline = baselineTwoCourts();
    const swapped = applyCourtPermutation(baseline, 10, [2, 1, 3]);
    const { movedIds, affectedIds } = diffMovedAndAffected(
      baseline,
      swapped,
      [2]
    );
    expect([...movedIds]).toEqual([2]);
    expect(affectedIds.has(1)).toBe(true);
    expect(affectedIds.has(11)).toBe(true);
    expect(affectedIds.has(12)).toBe(true);
    expect(affectedIds.has(4)).toBe(false);
    expect(movedIds.has(4)).toBe(false);
  });

  it('accumulates moved on second touch; no-op empty', () => {
    const baseline = baselineTwoCourts();
    const once = applyCourtPermutation(baseline, 10, [2, 1, 3]);
    const twice = applyCourtPermutation(once, 10, [2, 3, 1]);
    const { movedIds, affectedIds } = diffMovedAndAffected(baseline, twice, [
      2, 3,
    ]);
    expect(movedIds.has(2)).toBe(true);
    expect(movedIds.has(3)).toBe(true);
    expect(affectedIds.has(2)).toBe(false);

    const identity = applyCourtPermutation(baseline, 10, [1, 2, 3]);
    const noop = diffMovedAndAffected(baseline, identity, []);
    expect(noop.movedIds.size).toBe(0);
    expect(noop.affectedIds.size).toBe(0);
  });

  it('swapCompleteRound uses same apply path', () => {
    const baseline = baselineTwoCourts();
    const result = swapCompleteRound(baseline, 10, 1, 1);
    expect(result).not.toBeNull();
    expect(result!.completeMatchIds).toEqual([2, 1, 3]);
    const byId = Object.fromEntries(result!.matches.map(m => [m.id_match, m]));
    expect(byId[12].sequence_no).toBe(1);
    expect(byId[1].scheduled_start).toBe('10:00:00');
  });

  it('completeRoundCount and swap work with nested-only court id', () => {
    const nestedOnly: GameMatch[] = [
      {
        id_match: 1,
        match_kind: 'REGULAR',
        sequence_no: 1,
        scheduled_start: '10:00:00',
        scheduled_end: '10:30:00',
        edition_division_court: { id_edition_division_court: 77 },
      },
      {
        id_match: 2,
        match_kind: 'REGULAR',
        sequence_no: 2,
        scheduled_start: '10:30:00',
        scheduled_end: '11:00:00',
        edition_division_court: { id_edition_division_court: 77 },
      },
    ];
    expect(completeRoundCount(nestedOnly)).toBe(2);
    const result = swapCompleteRound(nestedOnly, 77, 1, 1);
    expect(result).not.toBeNull();
    expect(result!.matches.find(m => m.id_match === 2)?.sequence_no).toBe(1);
  });
});
