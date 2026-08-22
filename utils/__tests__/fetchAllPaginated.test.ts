import { fetchAllPaginated } from '@/utils/fetchAllPaginated';

describe('fetchAllPaginated', () => {
  it('concatenates all pages until last_page', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: 1 }],
        meta: { last_page: 2, current_page: 1 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 2 }],
        meta: { last_page: 2, current_page: 2 },
      });

    const result = await fetchAllPaginated(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.meta).toEqual({ last_page: 2, current_page: 2 });
  });
});
