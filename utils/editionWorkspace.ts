/**
 * Edition workspace helpers: ?ed= parsing and tab hrefs.
 */

export function parseEditionDivisionId(
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
export function parseEditionDivisionIdOptimistic(
  edParam: string | string[] | undefined,
  validIds: Array<number | string>,
  divisionsLoaded: boolean
): number | null {
  if (edParam == null) return null;
  const raw = Array.isArray(edParam) ? edParam[0] : edParam;
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  if (!divisionsLoaded) return id;
  return parseEditionDivisionId(edParam, validIds);
}

export function withEdQuery(
  href: string,
  editionDivisionId: number | null
): string {
  if (editionDivisionId == null) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}ed=${editionDivisionId}`;
}

export function buildEditionTopTabs(
  editionId: number,
  editionDivisionId: number | null
) {
  const base = `/editions/${editionId}`;
  const ed = editionDivisionId;
  return [
    {
      label: 'Details',
      href: withEdQuery(`${base}/details`, ed),
      match: '/details',
    },
    {
      label: 'Divisions',
      href: withEdQuery(`${base}/divisions`, ed),
      match: '/divisions',
    },
    {
      label: 'Schedule',
      href: withEdQuery(`${base}/schedule/knobs`, ed),
      match: '/schedule',
    },
    {
      label: 'Replacements',
      href: withEdQuery(`${base}/replacements`, ed),
      match: '/replacements',
    },
    {
      label: 'Lottery',
      href: withEdQuery(`${base}/lottery/prizes`, ed),
      match: '/lottery',
    },
    {
      label: 'PDFs',
      href: withEdQuery(`${base}/pdfs`, ed),
      match: '/pdfs',
    },
    {
      label: 'Scores',
      href: withEdQuery(`${base}/scores`, ed),
      match: '/scores',
    },
    {
      label: 'Standings',
      href: withEdQuery(`${base}/standings`, ed),
      match: '/standings',
    },
  ];
}
