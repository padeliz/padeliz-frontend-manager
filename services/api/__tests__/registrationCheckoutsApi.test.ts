import { RegistrationCheckoutsApiService } from '@/services/api/registrationCheckoutsApi';
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

describe('RegistrationCheckoutsApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('lists checkouts under /registration-checkouts with top-level queue', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id_checkout: 9, items: [] }],
      }),
    });
    const api = new RegistrationCheckoutsApiService();
    const res = await api.getCheckouts({
      queue: 'awaiting_proof',
      page: 1,
      per_page: 10,
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/v1/manager/registration-checkouts');
    expect(url).toContain('queue=awaiting_proof');
    expect(url).toContain('page=1');
    expect(url).not.toContain('filters%5Bqueue%5D');
    expect(res.data[0].id_checkout).toBe(9);
    expect(res.meta.total).toBe(1);
  });

  it('keeps abandoned_netopia and refund_pending queues distinct', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    const api = new RegistrationCheckoutsApiService();
    await api.getCheckouts({ queue: 'abandoned_netopia' });
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'queue=abandoned_netopia'
    );
    await api.getCheckouts({ queue: 'refund_pending' });
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      'queue=refund_pending'
    );
  });

  it('lists a player checkouts by filters[player_user_id] without a queue', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id_checkout: 5, player_user_id: 9, items: [] }] }),
    });
    const api = new RegistrationCheckoutsApiService();
    const res = await api.getPlayerCheckouts(9);

    const url = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(url).toContain('/api/v1/manager/registration-checkouts');
    expect(url).toContain('filters[player_user_id]=9');
    expect(url).not.toContain('queue=');
    expect(res.data[0].id_checkout).toBe(5);
    expect(res.meta.total).toBe(1);
  });
});
