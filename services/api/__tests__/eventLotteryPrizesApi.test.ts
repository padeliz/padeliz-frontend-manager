import { EventLotteryPrizesApiService } from '@/services/api/eventLotteryPrizesApi';
import { storageUtils } from '@/utils/storage';

jest.mock('@/utils/storage', () => ({
  storageUtils: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/utils/constants', () => ({
  API_BASE_URL: 'http://localhost:8000',
  API_MANAGER_PREFIX: '/api/v1/manager',
}));

describe('EventLotteryPrizesApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('appends include=luckies and top-level event_division_id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EventLotteryPrizesApiService();
    await api.getLotteryPrizes({
      per_page: 100,
      include: 'luckies',
      event_division_id: 2,
      filters: { lottery_id: 7 },
      sort_by: { display_order: 'asc' },
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('include=luckies');
    expect(url).toContain('event_division_id=2');
    expect(url).not.toContain('filters%5Bevent_division_id%5D');
    expect(url).toContain('filters%5Blottery_id%5D=7');
    expect(url).toContain('sort_by%5Bdisplay_order%5D=asc');
  });

  it('omits event_division_id when null', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EventLotteryPrizesApiService();
    await api.getLotteryPrizes({
      include: 'luckies',
      event_division_id: null,
      filters: { lottery_id: 7 },
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('include=luckies');
    expect(url).not.toContain('event_division_id=');
  });

  it('patchLotteryPrize PATCHes the prize line', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_lottery_prize: 11 } }),
    });
    const api = new EventLotteryPrizesApiService();
    await api.patchLotteryPrize(11, {
      prize_quantity: 3,
      sponsor_id: null,
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:8000/api/v1/manager/event-lottery-prizes/11'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      prize_quantity: 3,
      sponsor_id: null,
    });
  });

  it('reorderLotteryPrizes posts lottery_id and ordered ids', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    const api = new EventLotteryPrizesApiService();
    await api.reorderLotteryPrizes(7, [3, 1, 2]);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:8000/api/v1/manager/event-lottery-prizes/reorder'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      lottery_id: 7,
      lottery_prize_ids: [3, 1, 2],
    });
  });
});
