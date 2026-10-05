import { API_BASE_URL } from '@/utils/constants';

export type PrizeMediaInfo = {
  url: string | null;
  isVideo: boolean;
};

/** Absolutize /storage/… against API_BASE_URL; accept http(s) only otherwise. */
export function resolvePrizeMediaUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const cleaned = url.replace(/^\/+/, '');
  if (cleaned.startsWith('storage/')) {
    const base = (API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
    return `${base}/${cleaned}`;
  }
  return null;
}

/**
 * Resolve prize media from live/board API payloads (media_url + is_video).
 * Does not read disk `media_path` — callers must pass Storage `url` / `media_url`.
 */
export function resolvePrizeMedia(prize: unknown): PrizeMediaInfo {
  if (!prize || typeof prize !== 'object') {
    return { url: null, isVideo: false };
  }
  const p = prize as Record<string, unknown>;

  const urlCandidate =
    (typeof p.media_url === 'string' && p.media_url) ||
    (typeof p.url === 'string' && p.url) ||
    (typeof p.video === 'string' && p.video) ||
    (typeof p.mp4 === 'string' && p.mp4) ||
    (typeof p.media === 'string' && p.media) ||
    null;

  const resolved = resolvePrizeMediaUrl(urlCandidate);

  const isVideo =
    p.is_video === true ||
    (typeof resolved === 'string' &&
      /\.(mp4|webm|mov)(\?|$)/i.test(resolved));

  return { url: resolved, isVideo };
}

/**
 * Auto-announce once when countdown hits 0 and lucky is not yet announced.
 */
export function shouldAutoAnnounce(lucky: {
  seconds_left?: number | null;
  announced_at?: string | number | null;
  available_at?: string | number | null;
} | null | undefined): boolean {
  if (!lucky) return false;
  if (lucky.announced_at != null && lucky.announced_at !== '') return false;
  const left = lucky.seconds_left;
  if (left == null) return false;
  return Number(left) <= 0;
}
