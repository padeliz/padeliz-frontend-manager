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

  it('does not send with_luckies', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EditionLotteryRulesApiService();
    await api.getRules({ per_page: 100 });
    expect(fetchMock.mock.calls[0][0]).not.toContain('with_luckies');
  });

  it('appends filters[lottery_id] when provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EditionLotteryRulesApiService();
    await api.getRules({
      per_page: 100,
      filters: { lottery_id: 7, edition_division_id: 2 },
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('filters%5Blottery_id%5D=7');
    expect(url).toContain('filters%5Bedition_division_id%5D=2');
  });

  it('patchRule PATCHes the rule', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_lottery_rule: 9 } }),
    });
    const api = new EditionLotteryRulesApiService();
    await api.patchRule(9, {
      rule_prize_quantity: 2,
      edition_division_id: 4,
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:8000/api/v1/manager/edition-lottery-rules/9'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      rule_prize_quantity: 2,
      edition_division_id: 4,
    });
  });

  it('reorderLotteryRules posts lottery_id and ordered ids', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    const api = new EditionLotteryRulesApiService();
    await api.reorderLotteryRules(7, [9, 8, 7]);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:8000/api/v1/manager/edition-lottery-rules/reorder'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      lottery_id: 7,
      lottery_rule_ids: [9, 8, 7],
    });
  });
});
