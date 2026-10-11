/**
 * Europe/Bucharest wall-clock helpers for Manager event timestamps.
 * Matches product calendar timing in the Expo app.
 */

export const PRODUCT_TIMEZONE = 'Europe/Bucharest';

export type EventTiming = 'past' | 'ongoing' | 'upcoming';

/** Today's calendar date in Europe/Bucharest as YYYY-MM-DD (en-CA). */
export function todayYmdBucharest(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: PRODUCT_TIMEZONE });
}

/** Bucharest calendar day ("YYYY-MM-DD") for a unix epoch second. */
export function dayYmdFromUnix(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString('en-CA', {
    timeZone: PRODUCT_TIMEZONE,
  });
}

/** Bucharest wall-clock H:i for a unix epoch second. */
export function formatHiFromUnix(unix: number): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: PRODUCT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(unix * 1000));
  const hour = parts.find(p => p.type === 'hour')?.value ?? '00';
  const minute = parts.find(p => p.type === 'minute')?.value ?? '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/** Offset (ms) of PRODUCT_TIMEZONE from UTC at the given instant. */
function productTzOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PRODUCT_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) =>
    Number(parts.find(p => p.type === type)?.value);
  const wallAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour') % 24,
    part('minute'),
    part('second')
  );
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Instant for a Bucharest wall-clock date ("YYYY-MM-DD") and time ("HH:MM[:SS]").
 */
export function productDateTimeToDate(ymdStr: string, time: string): Date {
  const [y, m, d] = ymdStr.split('-').map(Number);
  const [hh, mm = 0, ss = 0] = time.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm, ss);
  if (Number.isNaN(naive)) return new Date(NaN);
  const first = naive - productTzOffsetMs(new Date(naive));
  return new Date(naive - productTzOffsetMs(new Date(first)));
}

/** Bucharest datetime-local value (YYYY-MM-DDTHH:mm) for a unix second. */
export function unixToBucharestDatetimeLocal(unix: number): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PRODUCT_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(unix * 1000));
  const part = (type: string) =>
    parts.find(p => p.type === type)?.value?.padStart(2, '0') ?? '00';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

/** Parse Bucharest datetime-local (YYYY-MM-DDTHH:mm[:ss]) to unix seconds. */
export function bucharestDatetimeLocalToUnix(local: string): number | null {
  if (!local?.trim()) return null;
  const normalized = local.trim().replace(' ', 'T');
  const [datePart, timePart] = normalized.split('T');
  if (!datePart || !timePart) return null;
  const time = timePart.length === 5 ? `${timePart}:00` : timePart;
  const dt = productDateTimeToDate(datePart, time);
  if (Number.isNaN(dt.getTime())) return null;
  return Math.floor(dt.getTime() / 1000);
}

export function classifyTiming(
  startsAtOrDay: number | string,
  endsAtOrDay?: number | string,
  now: Date = new Date()
): EventTiming {
  const today = todayYmdBucharest(now);
  const startsDay =
    typeof startsAtOrDay === 'string'
      ? startsAtOrDay
      : dayYmdFromUnix(startsAtOrDay);
  const endsRaw = endsAtOrDay === undefined ? startsAtOrDay : endsAtOrDay;
  const endsDay =
    typeof endsRaw === 'string' ? endsRaw : dayYmdFromUnix(endsRaw);

  if (today > endsDay) return 'past';
  if (today < startsDay) return 'upcoming';
  return 'ongoing';
}

export function formatDivisionPlayingWindow(
  playingStartsAt?: number | null,
  playingEndsAt?: number | null
): string {
  if (playingStartsAt == null || playingEndsAt == null) return '—';
  const startDay = dayYmdFromUnix(playingStartsAt);
  const endDay = dayYmdFromUnix(playingEndsAt);
  if (startDay === endDay) {
    return `${formatHiFromUnix(playingStartsAt)} – ${formatHiFromUnix(playingEndsAt)}`;
  }
  return `${startDay} ${formatHiFromUnix(playingStartsAt)} – ${endDay} ${formatHiFromUnix(playingEndsAt)}`;
}
