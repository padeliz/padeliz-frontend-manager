import { ScheduleApiService } from '@/services/api/scheduleApi';
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

describe('ScheduleApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('builds GET schedule URL with edition division id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          edition_division: { id_edition_division: 7 },
          courts: [],
          participations: [],
          matches: [],
          has_regular_matches: false,
          has_scores: false,
          has_standings: false,
          is_finalized: false,
        },
      }),
    });

    const api = new ScheduleApiService();
    await api.getSchedule(7);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'http://localhost:8000/api/v1/manager/edition-divisions/7/schedule'
    );
    expect(options.method).toBe('GET');
    expect(options.headers.Authorization).toBe('Bearer test-token');
  });

  it('appends board=1 when requested and posts reorder', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });
    const api = new ScheduleApiService();
    await api.getSchedule(7, { board: true });
    await api.reorderMatches(7, { court: 3, match_ids: [1, 2] });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/v1/manager/edition-divisions/7/schedule?board=1'
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      'http://localhost:8000/api/v1/manager/edition-divisions/7/schedule/matches/reorder'
    );
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
  });

  it('appends scores=1 when requested', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });
    const api = new ScheduleApiService();
    await api.getSchedule(7, { scores: true });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/v1/manager/edition-divisions/7/schedule?scores=1'
    );
  });

  it('builds preview / generate / form URLs', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    const api = new ScheduleApiService();
    await api.preview(12, { adjust: 2 });
    await api.generate(12, { confirm_replace: true });
    await api.updateForm(12, { player_matches_repeat: 1, adjust: 0 });
    await api.destroySchedule(12);

    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls).toEqual([
      'http://localhost:8000/api/v1/manager/edition-divisions/12/schedule/preview',
      'http://localhost:8000/api/v1/manager/edition-divisions/12/schedule/generate',
      'http://localhost:8000/api/v1/manager/edition-divisions/12/schedule/form',
      'http://localhost:8000/api/v1/manager/edition-divisions/12/schedule',
    ]);

    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(fetchMock.mock.calls[2][1].method).toBe('PUT');
    expect(fetchMock.mock.calls[3][1].method).toBe('DELETE');
  });
});
