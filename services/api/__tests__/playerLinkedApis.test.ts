import { PlayerEmailsApiService } from '@/services/api/playerEmailsApi';
import { PlayerIdentitiesApiService } from '@/services/api/playerIdentitiesApi';
import { PlayerPhonesApiService } from '@/services/api/playerPhonesApi';
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

const BASE = 'http://localhost:8000/api/v1/manager';

describe('Player linked resource API services', () => {
  const fetchMock = jest.fn();

  const ok = (body: unknown) => ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    return { url: decodeURIComponent(String(url)), init: init ?? {} };
  };

  describe.each([
    ['phones', PlayerPhonesApiService, 'player-phones', 'player_phone_ids'],
    ['emails', PlayerEmailsApiService, 'player-emails', 'player_email_ids'],
  ] as const)('%s', (kind, Service, path, idsKey) => {
    const api: any = new (Service as any)();
    const m = kind === 'phones' ? 'Phone' : 'Email';

    it('lists with player filter, search and paging', async () => {
      fetchMock.mockResolvedValue(ok({ data: [], meta: {}, links: {} }));
      await api[`get${m}s`]({
        page: 2,
        per_page: 5,
        q: 'abc',
        filters: { user_id: 7 },
      });
      const { url } = lastCall();
      expect(url).toContain(`${BASE}/${path}?`);
      expect(url).toContain('page=2');
      expect(url).toContain('per_page=5');
      expect(url).toContain('q=abc');
      expect(url).toContain('filters[user_id]=7');
    });

    it('creates with POST, updates with PUT and deletes with DELETE', async () => {
      fetchMock.mockResolvedValue(ok({ data: { id: 1 } }));

      await api[`create${m}`]({ user_id: 7 });
      expect(lastCall().url).toBe(`${BASE}/${path}`);
      expect(lastCall().init.method).toBe('POST');

      await api[`update${m}`](3, { is_primary: true });
      expect(lastCall().url).toBe(`${BASE}/${path}/3`);
      expect(lastCall().init.method).toBe('PUT');

      await api[`delete${m}`](3);
      expect(lastCall().url).toBe(`${BASE}/${path}/3`);
      expect(lastCall().init.method).toBe('DELETE');
    });

    it('bulk deletes through the bulk endpoint', async () => {
      fetchMock.mockResolvedValue(ok({ success: true, data: {} }));
      await api[`bulkDelete${m}s`]([1, 2]);
      const { url, init } = lastCall();
      expect(url).toBe(`${BASE}/${path}/bulk`);
      expect(init.method).toBe('DELETE');
      expect(JSON.parse(init.body)).toEqual({ [idsKey]: [1, 2] });
    });
  });

  describe('identities (no create)', () => {
    const api = new PlayerIdentitiesApiService();

    it('exposes no create method', () => {
      expect((api as any).createIdentity).toBeUndefined();
    });

    it('lists filtered by player and provider', async () => {
      fetchMock.mockResolvedValue(ok({ data: [], meta: {}, links: {} }));
      await api.getIdentities({
        filters: { user_id: 7, provider: 'google' },
      });
      const { url } = lastCall();
      expect(url).toContain(`${BASE}/player-identities?`);
      expect(url).toContain('filters[user_id]=7');
      expect(url).toContain('filters[provider]=google');
    });

    it('updates with PUT and deletes with DELETE', async () => {
      fetchMock.mockResolvedValue(ok({ data: {} }));
      await api.updateIdentity(4, { display_name: 'Ace' });
      expect(lastCall().url).toBe(`${BASE}/player-identities/4`);
      expect(lastCall().init.method).toBe('PUT');

      await api.deleteIdentity(4);
      expect(lastCall().url).toBe(`${BASE}/player-identities/4`);
      expect(lastCall().init.method).toBe('DELETE');
    });

    it('bulk deletes one by one and reports partial failures', async () => {
      fetchMock
        .mockResolvedValueOnce(ok({ success: true }))
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ message: 'Not found' }),
          text: async () => JSON.stringify({ message: 'Not found' }),
        });

      const res = await api.bulkDeleteIdentities([1, 2]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(res.data.total_requested).toBe(2);
      expect(res.data.total_successful).toBe(1);
      expect(res.data.total_failed).toBe(1);
      expect(res.data.successful).toEqual([{ id: 1 }]);
      expect(res.data.failed[0].id).toBe(2);
      expect(res.success).toBe(false);
    });
  });
});
