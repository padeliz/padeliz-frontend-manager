import { SponsorPrizesApiService } from '@/services/api/sponsorPrizesApi';
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

describe('SponsorPrizesApiService upsert', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('updates existing overlay keyed by sponsor_id and prize_id', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id_sponsor_prize: 12, sponsor_id: 1, prize_id: 4 }],
          meta: {},
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id_sponsor_prize: 12, sponsor_id: 1, prize_id: 4 },
        }),
      });
    const api = new SponsorPrizesApiService();
    const res = await api.upsertSponsorPrize({
      sponsor_id: 1,
      prize_id: 4,
      box_1_text: 'Hello',
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('sponsor-prizes');
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'filters%5Bsponsor_id%5D=1'
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      'filters%5Bprize_id%5D=4'
    );
    expect(fetchMock.mock.calls[1][0]).toContain('/sponsor-prizes/12');
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
    expect(res.data.id_sponsor_prize).toBe(12);
  });

  it('creates when no overlay exists for the pair', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], meta: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id_sponsor_prize: 99, sponsor_id: 1, prize_id: 4 },
        }),
      });
    const api = new SponsorPrizesApiService();
    const res = await api.upsertSponsorPrize({
      sponsor_id: 1,
      prize_id: 4,
    });
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
    expect(res.data.id_sponsor_prize).toBe(99);
  });
});
