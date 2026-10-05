/**
 * Pure helpers for Matches board local-draft reorder (arrows + DnD).
 * Syncs complete-round permutation across courts; leaves scheduled_* unchanged.
 */

import { GameMatch } from '@/types/api/event';

export function completeRoundCount(matches: GameMatch[]): number {
  const regular = matches.filter(
    m => m.match_kind === 'REGULAR' || !m.match_kind
  );
  const byCourt = new Map<number, number>();
  for (const m of regular) {
    const courtId = courtIdOf(m);
    byCourt.set(courtId, (byCourt.get(courtId) ?? 0) + 1);
  }
  if (byCourt.size === 0) return 0;
  return Math.min(...Array.from(byCourt.values()));
}

export function isSparseMatch(m: GameMatch, completeCount: number): boolean {
  return (m.sequence_no ?? 0) > completeCount;
}

export function courtIdOf(m: GameMatch): number {
  return Number(
    m.event_division_court_id ??
      m.event_division_court?.id_event_division_court ??
      0
  );
}

function regularMatches(matches: GameMatch[]): GameMatch[] {
  return matches.filter(m => m.match_kind === 'REGULAR' || !m.match_kind);
}

function sortBySequence(a: GameMatch, b: GameMatch): number {
  return (a.sequence_no ?? 0) - (b.sequence_no ?? 0);
}

function completeOrderedOnCourt(
  matches: GameMatch[],
  courtId: number,
  completeCount: number
): GameMatch[] {
  return regularMatches(matches)
    .filter(m => courtIdOf(m) === courtId)
    .filter(m => (m.sequence_no ?? 0) <= completeCount)
    .sort(sortBySequence);
}

function sparseOnCourt(
  matches: GameMatch[],
  courtId: number,
  completeCount: number
): GameMatch[] {
  return regularMatches(matches)
    .filter(m => courtIdOf(m) === courtId)
    .filter(m => (m.sequence_no ?? 0) > completeCount)
    .sort(sortBySequence);
}

/**
 * Map reference-court complete ids (new order) → oldIndex → newPos permutation,
 * then apply the same remapping on every court's complete block.
 * Preserves each match's scheduled_* (and other fields); only sequence_no changes.
 */
export function applyCourtPermutation(
  matches: GameMatch[],
  referenceCourtId: number,
  newCompleteMatchIds: number[]
): GameMatch[] {
  const completeCount = completeRoundCount(matches);
  if (completeCount < 1) return matches.map(m => ({ ...m }));

  const refComplete = completeOrderedOnCourt(
    matches,
    referenceCourtId,
    completeCount
  );
  if (refComplete.length !== completeCount) {
    return matches.map(m => ({ ...m }));
  }

  const expectedIds = refComplete.map(m => m.id_match);
  const incoming = newCompleteMatchIds.map(Number);
  if (
    incoming.length !== expectedIds.length ||
    new Set(incoming).size !== incoming.length ||
    expectedIds.some(id => !incoming.includes(id)) ||
    incoming.some(id => !expectedIds.includes(id))
  ) {
    return matches.map(m => ({ ...m }));
  }

  const idToOldIndex = new Map<number, number>();
  refComplete.forEach((m, index) => idToOldIndex.set(m.id_match, index));

  const newPositionOfOldIndex: number[] = new Array(completeCount);
  incoming.forEach((matchId, newPos) => {
    newPositionOfOldIndex[idToOldIndex.get(matchId)!] = newPos;
  });

  const courtIds = [
    ...new Set(regularMatches(matches).map(m => courtIdOf(m))),
  ];

  const nextById = new Map<number, GameMatch>();
  for (const m of matches) {
    nextById.set(m.id_match, { ...m });
  }

  for (const courtId of courtIds) {
    const complete = completeOrderedOnCourt(matches, courtId, completeCount);
    if (complete.length !== completeCount) continue;

    const reordered: GameMatch[] = new Array(completeCount);
    for (let newPos = 0; newPos < completeCount; newPos++) {
      const oldIndex = newPositionOfOldIndex.indexOf(newPos);
      reordered[newPos] = complete[oldIndex];
    }

    reordered.forEach((m, newPos) => {
      const copy = nextById.get(m.id_match)!;
      nextById.set(m.id_match, {
        ...copy,
        sequence_no: newPos + 1,
        // scheduled_* intentionally unchanged
      });
    });

    const sparse = sparseOnCourt(matches, courtId, completeCount);
    sparse.forEach((m, offset) => {
      const copy = nextById.get(m.id_match)!;
      nextById.set(m.id_match, {
        ...copy,
        sequence_no: completeCount + offset + 1,
      });
    });
  }

  return matches.map(m => nextById.get(m.id_match) ?? { ...m });
}

/** Swap a complete-round match up/down on a court; returns new list + that court's complete ids. */
export function swapCompleteRound(
  matches: GameMatch[],
  courtId: number,
  matchId: number,
  direction: -1 | 1
): { matches: GameMatch[]; completeMatchIds: number[] } | null {
  const completeCount = completeRoundCount(matches);
  const complete = completeOrderedOnCourt(matches, courtId, completeCount);
  const index = complete.findIndex(m => m.id_match === matchId);
  const swapWith = index + direction;
  if (index < 0 || swapWith < 0 || swapWith >= complete.length) return null;
  if (isSparseMatch(complete[index], completeCount)) return null;

  const next = [...complete];
  const tmp = next[index];
  next[index] = next[swapWith];
  next[swapWith] = tmp;
  const completeMatchIds = next.map(m => m.id_match);
  return {
    matches: applyCourtPermutation(matches, courtId, completeMatchIds),
    completeMatchIds,
  };
}

function completeOrderByCourt(
  matches: GameMatch[],
  completeCount: number
): Map<number, number[]> {
  const map = new Map<number, number[]>();
  const courtIds = [
    ...new Set(regularMatches(matches).map(m => courtIdOf(m))),
  ];
  for (const courtId of courtIds) {
    map.set(
      courtId,
      completeOrderedOnCourt(matches, courtId, completeCount).map(
        m => m.id_match
      )
    );
  }
  return map;
}

/**
 * moved = user-touched ids; affected = other REGULARs whose complete-round order changed.
 * Sparse never flagged.
 */
export function diffMovedAndAffected(
  baseline: GameMatch[],
  draft: GameMatch[],
  touchedIds: Iterable<number>
): { movedIds: Set<number>; affectedIds: Set<number> } {
  const completeCount = completeRoundCount(baseline);
  const movedIds = new Set<number>();
  for (const id of touchedIds) {
    if (!isSparseMatch(
      baseline.find(m => m.id_match === id) ||
        draft.find(m => m.id_match === id) ||
        ({ sequence_no: 0 } as GameMatch),
      completeCount
    )) {
      movedIds.add(Number(id));
    }
  }

  const baseOrders = completeOrderByCourt(baseline, completeCount);
  const draftOrders = completeOrderByCourt(draft, completeCount);
  const affectedIds = new Set<number>();

  for (const [courtId, baseIds] of baseOrders) {
    const draftIds = draftOrders.get(courtId) || [];
    for (let i = 0; i < baseIds.length; i++) {
      const id = baseIds[i];
      const draftPos = draftIds.indexOf(id);
      if (draftPos !== i && !movedIds.has(id)) {
        affectedIds.add(id);
      }
    }
  }

  return { movedIds, affectedIds };
}
