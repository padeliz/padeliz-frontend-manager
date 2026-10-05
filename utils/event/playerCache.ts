/**
 * Normalize + diacritic-fold for local player filter.
 */
import { normalizeSearchText } from '@/utils/textNormalize';

export { normalizeSearchText } from '@/utils/textNormalize';

export function filterPlayersLocally<
  T extends {
    id_player: number;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  },
>(players: T[], query: string): T[] {
  const q = normalizeSearchText(query);
  if (q.length < 2) return [];
  return players.filter(p => {
    const label = normalizeSearchText(
      p.name || `${p.first_name || ''} ${p.last_name || ''}`
    );
    return label.includes(q) || String(p.id_player).includes(q);
  });
}

/**
 * Async paginate until exhausted (Mode B player cache).
 */
export async function loadAllPlayersPages(
  fetchPage: (page: number, perPage: number) => Promise<{
    data: any[];
    meta?: { last_page?: number; current_page?: number };
  }>,
  perPage = 100,
  onProgress?: (players: any[]) => void
): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const res = await fetchPage(page, perPage);
    const chunk = res.data || [];
    all.push(...chunk);
    onProgress?.([...all]);
    lastPage = Number(res.meta?.last_page) || page;
    page += 1;
  } while (page <= lastPage);
  return all;
}
