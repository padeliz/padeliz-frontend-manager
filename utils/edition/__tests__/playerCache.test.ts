import {
  filterPlayersLocally,
  loadAllPlayersPages,
  normalizeSearchText,
} from '@/utils/edition/playerCache';

describe('playerCache', () => {
  it('normalizes diacritics', () => {
    expect(normalizeSearchText('José')).toBe('jose');
  });

  it('filters locally with min 2 chars', () => {
    const players = [
      { id_player: 1, name: 'Ana Pop' },
      { id_player: 2, name: 'Ion Ionescu' },
    ];
    expect(filterPlayersLocally(players, 'a')).toEqual([]);
    expect(filterPlayersLocally(players, 'an').map(p => p.id_player)).toEqual([
      1,
    ]);
  });

  it('loads pages until exhausted', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({
        data: [{ id_player: 1 }],
        meta: { last_page: 2, current_page: 1 },
      })
      .mockResolvedValueOnce({
        data: [{ id_player: 2 }],
        meta: { last_page: 2, current_page: 2 },
      });
    const all = await loadAllPlayersPages(fetchPage, 100);
    expect(all).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
