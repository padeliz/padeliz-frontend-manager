/**
 * Player level helpers. Levels are two-decimal values inside seeded bands.
 * Numerically lower = stronger, so a band's `level_min` (weakest) is the larger
 * number and `level_max` (strongest) the smaller one; we never assume the order.
 */

import { ApiLevel } from '@/types/api/entities';

const TWO_DECIMALS = /^\d+\.\d{2}$/;

export function isTwoDecimalLevel(value: string): boolean {
  return TWO_DECIMALS.test(value.trim());
}

function bandRange(band: Pick<ApiLevel, 'level_min' | 'level_max'>): [number, number] {
  const a = Number(band.level_min);
  const b = Number(band.level_max);
  return a <= b ? [a, b] : [b, a];
}

export function findBandForLevel(
  bands: ApiLevel[],
  value: string
): ApiLevel | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return (
    bands.find(band => {
      const [lo, hi] = bandRange(band);
      return n >= lo - 1e-9 && n <= hi + 1e-9;
    }) ?? null
  );
}

/**
 * Client-side pre-check; the API stays authoritative. Band check is skipped
 * when the bands could not be loaded (empty list).
 */
export function validatePlayerLevelInput(
  value: string,
  bands: ApiLevel[]
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Enter a player level.';
  if (!isTwoDecimalLevel(trimmed)) {
    return 'Level must have exactly 2 decimals (e.g. 3.50).';
  }
  if (bands.length > 0 && !findBandForLevel(bands, trimmed)) {
    return 'Level is outside every seeded band.';
  }
  return null;
}

export function formatBandRange(
  band: Pick<ApiLevel, 'level_min' | 'level_max'>
): string {
  return `${band.level_min} → ${band.level_max}`;
}

/** Normalise a free-text bound to what the API accepts (`null` = unset). */
export function boundOrNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}
