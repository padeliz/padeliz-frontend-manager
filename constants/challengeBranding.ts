/**
 * Sense4Fit Summit 2026 challenge live branding (coordinators + prize partners).
 * Logos are served from Laravel public/media via API_BASE_URL.
 */

import { API_BASE_URL } from '@/utils/constants';

const MEDIA_ROOT = 'media/sense4fit-summit-2026-padel-challenges';

export const CHALLENGE_PRIZE_PARTNER_LOGO_MAX_HEIGHT = 48;
export const CHALLENGE_COORDINATOR_LOGO_MAX_HEIGHT = 95;

/** Aspect-fit size inside a max box (upscale or downscale; no crop). */
export function fitLogoSize(
  natW: number,
  natH: number,
  maxW: number,
  maxH: number
): { width: number; height: number } {
  if (natW <= 0 || natH <= 0 || maxW <= 0 || maxH <= 0) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(maxW / natW, maxH / natH);
  return { width: natW * scale, height: natH * scale };
}

export function challengeMediaUrl(relativePath: string): string {
  const base = (API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const path = relativePath.replace(/^\/+/, '');
  return `${base}/${MEDIA_ROOT}/${path}`;
}

const COORDINATOR_PATHS = [
  'coordinators/sense4fit-summit-2026.png',
  'coordinators/padel-one-yellow.png',
] as const;

const PRIZE_PARTNER_ROW_PATHS = [
  [
    'prize-sponsors/cupio.png',
    'prize-sponsors/forge-g.png',
    'prize-sponsors/frispy-fruits.png',
    'prize-sponsors/mogyi.png',
  ],
  [
    'prize-sponsors/none-health.png',
    'prize-sponsors/oshee.png',
    'prize-sponsors/padelxp.png',
    'prize-sponsors/vitamin-aqua.png',
  ],
] as const;

export const CHALLENGE_COORDINATOR_LOGOS: string[] = COORDINATOR_PATHS.map(
  challengeMediaUrl
);

export const CHALLENGE_PRIZE_PARTNER_ROWS: string[][] =
  PRIZE_PARTNER_ROW_PATHS.map(row => row.map(challengeMediaUrl));
