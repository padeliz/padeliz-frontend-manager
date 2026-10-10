/**
 * Json-type player custom fields (e.g. `racket_experience`): display + editor helpers.
 */

import { ApiPlayerCustomField } from '@/types/api/entities';

export const RACKET_EXPERIENCE_CODE = 'racket_experience';

export const RACKET_EXPERIENCE_MEASURES = [
  'years_of_playing',
  'matches_played',
  'lessons_had',
] as const;

export type RacketExperienceMeasure =
  (typeof RACKET_EXPERIENCE_MEASURES)[number];

export type RacketExperienceDraftEntry = {
  sport: string;
  level: string;
  years_of_playing: string;
  matches_played: string;
  lessons_had: string;
};

const MEASURE_LABELS: Record<RacketExperienceMeasure, string> = {
  years_of_playing: 'years',
  matches_played: 'matches',
  lessons_had: 'lessons',
};

export function isJsonField(
  field: Pick<ApiPlayerCustomField, 'type'> | null | undefined
): boolean {
  return field?.type === 'json';
}

export function isRacketExperienceField(
  field: Pick<ApiPlayerCustomField, 'code' | 'type'> | null | undefined
): boolean {
  return isJsonField(field) && field?.code === RACKET_EXPERIENCE_CODE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One readable line per racket-experience entry, e.g. `Padel · Beginner · 2 years · 10 matches`. */
export function formatRacketExperience(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(entry => {
    const parts: string[] = [];
    if (entry.sport != null) parts.push(String(entry.sport));
    if (entry.level != null) parts.push(String(entry.level));
    for (const measure of RACKET_EXPERIENCE_MEASURES) {
      const v = entry[measure];
      if (v !== undefined && v !== null && v !== '') {
        parts.push(`${v} ${MEASURE_LABELS[measure]}`);
      }
    }
    return parts.join(' · ');
  });
}

/**
 * Display text for a json custom field value (`value_json` / `value`).
 * Racket experience becomes a readable list; anything else is compact JSON.
 */
export function formatJsonFieldValue(
  field: Pick<ApiPlayerCustomField, 'code' | 'type'> | null | undefined,
  value: unknown
): string {
  if (value === null || value === undefined || value === '') return '—';
  if (isRacketExperienceField(field)) {
    const lines = formatRacketExperience(value);
    if (lines.length > 0) return lines.join('\n');
  }
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function emptyRacketExperienceEntry(): RacketExperienceDraftEntry {
  return {
    sport: '',
    level: '',
    years_of_playing: '',
    matches_played: '',
    lessons_had: '',
  };
}

export function racketExperienceToDraft(
  value: unknown
): RacketExperienceDraftEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(entry => ({
    sport: entry.sport != null ? String(entry.sport) : '',
    level: entry.level != null ? String(entry.level) : '',
    years_of_playing:
      entry.years_of_playing != null ? String(entry.years_of_playing) : '',
    matches_played:
      entry.matches_played != null ? String(entry.matches_played) : '',
    lessons_had: entry.lessons_had != null ? String(entry.lessons_had) : '',
  }));
}

export type JsonBuildResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

/** Validate the structured racket-experience editor and build the API value. */
export function buildRacketExperienceValue(
  entries: RacketExperienceDraftEntry[]
): JsonBuildResult {
  if (entries.length === 0) {
    return { ok: false, error: 'Add at least one racket experience entry.' };
  }
  const seen = new Set<string>();
  const out: Array<Record<string, string | number>> = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const sport = entry.sport.trim();
    const level = entry.level.trim();
    const row = i + 1;
    if (!sport) return { ok: false, error: `Entry ${row}: choose a sport.` };
    if (seen.has(sport)) {
      return {
        ok: false,
        error: `Entry ${row}: each sport may only be reported once.`,
      };
    }
    seen.add(sport);
    if (!level) return { ok: false, error: `Entry ${row}: choose a level.` };

    const built: Record<string, string | number> = { sport, level };
    for (const measure of RACKET_EXPERIENCE_MEASURES) {
      const raw = entry[measure].trim();
      if (raw === '') continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        return {
          ok: false,
          error: `Entry ${row}: ${measure} must be a number ≥ 0.`,
        };
      }
      built[measure] = n;
    }
    if (Object.keys(built).length === 2) {
      return {
        ok: false,
        error: `Entry ${row}: enter years of playing, matches played or lessons had.`,
      };
    }
    out.push(built);
  }
  return { ok: true, value: out };
}

/** Parse the generic json textarea; the API accepts an object/array. */
export function parseJsonDraft(text: string): JsonBuildResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Enter a JSON value.' };
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== 'object') {
      return { ok: false, error: 'JSON value must be an object or array.' };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: 'Value must be valid JSON.' };
  }
}

export function allowedStrings(
  rules: Record<string, unknown> | null | undefined,
  key: 'sports' | 'levels'
): string[] {
  const raw = rules?.[key];
  return Array.isArray(raw) ? raw.map(String) : [];
}
