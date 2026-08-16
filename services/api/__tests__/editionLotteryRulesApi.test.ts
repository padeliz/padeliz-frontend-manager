import { EditionLotteryRulesApiService } from '@/services/api/editionLotteryRulesApi';
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

describe('EditionLotteryRulesApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('appends with_luckies=1 when requested', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EditionLotteryRulesApiService();
    await api.getRules({ with_luckies: true, per_page: 100 });
    expect(fetchMock.mock.calls[0][0]).toContain('with_luckies=1');
  });

  it('omits with_luckies when absent or false', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EditionLotteryRulesApiService();
    await api.getRules({ per_page: 50 });
    expect(fetchMock.mock.calls[0][0]).not.toContain('with_luckies');
    await api.getRules({ with_luckies: false });
    expect(fetchMock.mock.calls[1][0]).not.toContain('with_luckies');
  });
});
