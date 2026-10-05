/**
 * Event workspace helpers: ?ed= parsing and tab hrefs.
 */

export function parseEventDivisionId(
  edParam: string | string[] | undefined,
  validIds: Array<number | string>
): number | null {
  if (edParam == null) return null;
  const raw = Array.isArray(edParam) ? edParam[0] : edParam;
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  const normalized = validIds.map(Number).filter(Number.isFinite);
  if (!normalized.includes(id)) return null;
  return id;
}

/**
 * While divisions are still loading, keep a numeric ed from the URL
 * so tabs don't snap to General and drop ?ed=.
 */
export function parseEventDivisionIdOptimistic(
  edParam: string | string[] | undefined,
  validIds: Array<number | string>,
  divisionsLoaded: boolean
): number | null {
  if (edParam == null) return null;
  const raw = Array.isArray(edParam) ? edParam[0] : edParam;
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  if (!divisionsLoaded) return id;
  return parseEventDivisionId(edParam, validIds);
}

export function withEdQuery(
  href: string,
  eventDivisionId: number | null
): string {
  if (eventDivisionId == null) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}ed=${eventDivisionId}`;
}

export function parseLotteryId(
  lotteryParam: string | string[] | undefined,
  validIds?: Array<number | string>
): number | null {
  if (lotteryParam == null) return null;
  const raw = Array.isArray(lotteryParam) ? lotteryParam[0] : lotteryParam;
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  if (validIds != null) {
    const normalized = validIds.map(Number).filter(Number.isFinite);
    if (!normalized.includes(id)) return null;
  }
  return id;
}

export function withLotteryQuery(
  href: string,
  lotteryId: number | null
): string {
  const qIndex = href.indexOf('?');
  const path = qIndex >= 0 ? href.slice(0, qIndex) : href;
  const existing = qIndex >= 0 ? href.slice(qIndex + 1) : '';
  const search = new URLSearchParams(existing);
  if (lotteryId == null) {
    search.delete('lottery');
  } else {
    search.set('lottery', String(lotteryId));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function buildEventTopTabs(
  eventId: number,
  eventDivisionId: number | null,
  lotteryId: number | null = null
) {
  const base = `/events/${eventId}`;
  const ed = eventDivisionId;
  const href = (path: string) =>
    withLotteryQuery(withEdQuery(`${base}${path}`, ed), lotteryId);
  return [
    {
      label: 'Details',
      href: href('/details'),
      match: '/details',
    },
    {
      label: 'Divisions',
      href: href('/divisions'),
      match: '/divisions',
    },
    {
      label: 'Registrations',
      href: href('/registrations'),
      match: '/registrations',
    },
    {
      label: 'Participations',
      href: href('/participations'),
      match: '/participations',
    },
    {
      label: 'Referrals',
      href: href('/referrals'),
      match: '/referrals',
    },
    {
      label: 'Schedule',
      href: href('/schedule/knobs'),
      match: '/schedule',
    },
    {
      label: 'Replacements',
      href: href('/replacements'),
      match: '/replacements',
    },
    {
      label: 'Lottery',
      href: href('/lottery/prizes'),
      match: '/lottery',
    },
    {
      label: 'PDFs',
      href: href('/pdfs'),
      match: '/pdfs',
    },
    {
      label: 'Scores',
      href: href('/scores'),
      match: '/scores',
    },
    {
      label: 'Standings',
      href: href('/standings'),
      match: '/standings',
    },
  ];
}
