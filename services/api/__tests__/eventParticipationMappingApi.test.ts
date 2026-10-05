/**
 * @jest-environment jsdom
 */
import { EventParticipationMappingApiService } from '@/services/api/eventParticipationMappingApi';
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

describe('EventParticipationMappingApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('previews via GET /events/{id}/participations/map/preview', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { can_map: true, disabled_reason: null },
        message: 'ok',
      }),
    });

    const api = new EventParticipationMappingApiService();
    await api.preview(12);

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/events/12/participations/map/preview'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('maps via POST with confirm_overwrite', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { created_count: 3, by_event_division: [] },
        message: 'ok',
      }),
    });

    const api = new EventParticipationMappingApiService();
    await api.map(12, { confirm_overwrite: true });

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/events/12/participations/map'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      confirm_overwrite: true,
    });
  });
});
