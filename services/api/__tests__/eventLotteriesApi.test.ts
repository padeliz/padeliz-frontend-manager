import { EventLotteriesApiService } from '@/services/api/eventLotteriesApi';
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

describe('EventLotteriesApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('generateRules posts to the lottery generate endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], message: 'ok' }),
    });
    const api = new EventLotteriesApiService();
    await api.generateRules(12);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:8000/api/v1/manager/event-lotteries/12/rules/generate'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });
});
