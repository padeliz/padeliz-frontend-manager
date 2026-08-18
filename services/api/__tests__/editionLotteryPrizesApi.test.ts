import { EditionLotteryPrizesApiService } from '@/services/api/editionLotteryPrizesApi';
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

describe('EditionLotteryPrizesApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('appends include=luckies and top-level edition_division_id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EditionLotteryPrizesApiService();
    await api.getLotteryPrizes({
      per_page: 100,
      include: 'luckies',
      edition_division_id: 2,
      filters: { lottery_id: 7 },
      sort_by: { display_order: 'asc' },
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('include=luckies');
    expect(url).toContain('edition_division_id=2');
    expect(url).not.toContain('filters%5Bedition_division_id%5D');
    expect(url).toContain('filters%5Blottery_id%5D=7');
    expect(url).toContain('sort_by%5Bdisplay_order%5D=asc');
  });

  it('omits edition_division_id when null', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EditionLotteryPrizesApiService();
    await api.getLotteryPrizes({
      include: 'luckies',
      edition_division_id: null,
      filters: { lottery_id: 7 },
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('include=luckies');
    expect(url).not.toContain('edition_division_id=');
  });
});
