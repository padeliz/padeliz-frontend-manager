import { ScheduleMatchPreview, SchedulePreview } from '@/types/api/edition';

/**
 * API returns matches_by_court as courtIndex → Match[].
 * Normalize to a flat list of matches for display.
 */
export function flattenMatchesByCourt(
  matchesByCourt: SchedulePreview['matches_by_court']
): ScheduleMatchPreview[] {
  if (!matchesByCourt) return [];

  if (Array.isArray(matchesByCourt)) {
    // Already flat (each item has side_a) or nested (each item is an array)
    if (
      matchesByCourt.length > 0 &&
      Array.isArray((matchesByCourt as unknown[])[0])
    ) {
      return (matchesByCourt as unknown as ScheduleMatchPreview[][]).flatMap(
        (courtMatches, courtIndex) =>
          (courtMatches || []).map(m => ({
            ...m,
            court_index: m.court_index ?? courtIndex,
          }))
      );
    }
    // Flat list of matches
    if (
      matchesByCourt.length === 0 ||
      typeof (matchesByCourt[0] as ScheduleMatchPreview)?.side_a !== 'undefined'
    ) {
      return matchesByCourt as ScheduleMatchPreview[];
    }
  }

  // Record / object keyed by court index
  if (typeof matchesByCourt === 'object') {
    const rows: ScheduleMatchPreview[] = [];
    for (const [key, value] of Object.entries(matchesByCourt)) {
      const courtIndex = Number(key);
      if (!Array.isArray(value)) continue;
      for (const m of value as ScheduleMatchPreview[]) {
        rows.push({
          ...m,
          court_index: m.court_index ?? (Number.isFinite(courtIndex) ? courtIndex : undefined),
        });
      }
    }
    return rows;
  }

  return [];
}

export function canConfirmReplaceSchedule(state: {
  has_regular_matches?: boolean;
  has_scores?: boolean;
  has_standings?: boolean;
  is_finalized?: boolean;
}): boolean {
  return (
    !!state.has_regular_matches &&
    !state.has_scores &&
    !state.has_standings &&
    !state.is_finalized
  );
}

export function isGenerateBlocked(state: {
  has_scores?: boolean;
  has_standings?: boolean;
  is_finalized?: boolean;
}): boolean {
  return !!state.has_scores || !!state.has_standings || !!state.is_finalized;
}

/** One-line reason when Generate is blocked (priority: finalized → scores → standings). */
export function generateBlockedReason(state: {
  has_scores?: boolean;
  has_standings?: boolean;
  is_finalized?: boolean;
}): string | null {
  if (!isGenerateBlocked(state)) return null;
  if (state.is_finalized) return 'Generate is blocked because the edition is finalized.';
  if (state.has_scores) return 'Generate is blocked because matches already have scores.';
  if (state.has_standings) return 'Generate is blocked because standings already exist.';
  return 'Generate is blocked.';
}
