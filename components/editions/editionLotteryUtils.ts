import { API_BASE_URL } from '@/utils/constants';
import { Alert } from 'react-native';

export function resolveBoardAsset(path: unknown): string | null {
  if (!path || typeof path !== 'string') return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = (API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const cleaned = path.replace(/^\/+/, '');
  if (cleaned.startsWith('media/')) return `${base}/${cleaned}`;
  return `${base}/media/${cleaned}`;
}

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void
) {
  if (typeof window !== 'undefined' && window.confirm) {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm },
    ]);
  }
}

export function formatUnixDateTime24h(value: unknown): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return String(value);
  const ms = n > 1e12 ? n : n * 1000;
  try {
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return String(value);
  }
}

export function formatLotteryTimestamp(value: unknown): string {
  return formatUnixDateTime24h(value);
}

/** Remaining time until available_at as total-minutes MM:SS; null if unusable. */
export function formatAnnounceCountdown(
  availableAt: unknown,
  nowMs: number = Date.now()
): string | null {
  if (availableAt == null || availableAt === '') return null;
  const n = Number(availableAt);
  if (!Number.isFinite(n) || n <= 0) return null;
  const availableAtMs = n > 1e12 ? n : n * 1000;
  const remainingMs = Math.max(0, availableAtMs - nowMs);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export type LuckyLifecycleKey =
  | 'rejected'
  | 'accepted'
  | 'announced'
  | 'available'
  | 'drawn';

const LIFECYCLE_ORDER: Array<{ key: LuckyLifecycleKey; field: string; label: string }> = [
  { key: 'rejected', field: 'rejected_at', label: 'Rejected' },
  { key: 'accepted', field: 'accepted_at', label: 'Accepted' },
  { key: 'announced', field: 'announced_at', label: 'Announced' },
  { key: 'available', field: 'available_at', label: 'Available' },
  { key: 'drawn', field: 'drawn_at', label: 'Drawn' },
];

/** First non-null lifecycle timestamp in priority order. */
export function primaryLuckyLifecycle(lucky: Record<string, unknown>): {
  key: LuckyLifecycleKey;
  label: string;
  value: unknown;
} | null {
  for (const row of LIFECYCLE_ORDER) {
    const value = lucky[row.field];
    if (value != null && value !== '') {
      return { key: row.key, label: row.label, value };
    }
  }
  return null;
}

export function luckyLifecycleRows(lucky: Record<string, unknown>): Array<{
  key: LuckyLifecycleKey;
  label: string;
  display: string;
}> {
  return LIFECYCLE_ORDER.map(row => ({
    key: row.key,
    label: row.label,
    display: formatLotteryTimestamp(lucky[row.field]),
  }));
}

export function divisionLabel(
  editionDivisionId: number | null | undefined,
  divisions: Array<{ id_edition_division: number; division_title?: string; division?: { name?: string } }>
): string {
  if (editionDivisionId == null) return 'General';
  const ed = divisions.find(d => d.id_edition_division === editionDivisionId);
  return (
    ed?.division_title ||
    ed?.division?.name ||
    `ED #${editionDivisionId}`
  );
}

const LUCKY_ACTIVITY_FIELDS = [
  'updated_at',
  'rejected_at',
  'accepted_at',
  'announced_at',
  'available_at',
  'drawn_at',
  'inserted_at',
] as const;

/** Max non-null lifecycle/timestamp among a lucky's activity fields. */
export function luckyActivityTs(lucky: Record<string, unknown>): number {
  let max = 0;
  for (const field of LUCKY_ACTIVITY_FIELDS) {
    const n = Number(lucky[field]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

export function maxLuckyGroupActivity(items: Array<Record<string, unknown>>): number {
  let max = 0;
  for (const item of items) {
    const n = luckyActivityTs(item);
    if (n > max) max = n;
  }
  return max;
}

/** Relative wording for last refresh; `nowMs`/`thenMs` are epoch milliseconds. */
export function formatLastRefreshRelative(
  thenMs: number,
  nowMs: number = Date.now()
): string {
  const sec = Math.max(0, Math.floor((nowMs - thenMs) / 1000));
  if (sec < 60) {
    return sec === 1 ? 'Last refresh 1 second ago' : `Last refresh ${sec} seconds ago`;
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return min === 1 ? 'Last refresh 1 minute ago' : `Last refresh ${min} minutes ago`;
  }
  const hr = Math.floor(min / 60);
  return hr === 1 ? 'Last refresh 1 hour ago' : `Last refresh ${hr} hours ago`;
}

export function rulesHaveUnresolvedLucky(
  rules: Array<{ luckies?: Array<Record<string, unknown>> | null }>
): boolean {
  for (const rule of rules) {
    const items = Array.isArray(rule.luckies) ? rule.luckies : [];
    for (const lucky of items) {
      if (
        (lucky.accepted_at == null || lucky.accepted_at === '') &&
        (lucky.rejected_at == null || lucky.rejected_at === '')
      ) {
        return true;
      }
    }
  }
  return false;
}

export function phoneNumbersFromLucky(lucky: Record<string, unknown>): string[] {
  const participation =
    (lucky.drawn_participation as Record<string, unknown> | undefined) ||
    (lucky.drawnParticipation as Record<string, unknown> | undefined);
  const player = participation?.player as Record<string, unknown> | undefined;
  const phones = player?.phones;
  if (!Array.isArray(phones)) return [];
  return phones
    .map((p: any) => (p?.phone != null ? String(p.phone) : ''))
    .filter(Boolean);
}
