import {
  EventRegistrationsApiService,
  REGISTRATION_CANCEL_REASONS,
  REGISTRATION_DECLINE_REASONS,
} from '@/services/api/eventRegistrationsApi';
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

describe('EventRegistrationsApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('lists registrations under /event-registrations', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EventRegistrationsApiService();
    await api.getRegistrations({
      filters: { event_id: 4 },
      sort_by: { inserted_at: 'desc' },
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/v1/manager/event-registrations');
    expect(url).toContain('filters%5Bevent_id%5D=4');
    expect(url).toContain('sort_by%5Binserted_at%5D=desc');
  });

  it('sends top-level queue on getRegistrations', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EventRegistrationsApiService();
    await api.getRegistrations({ queue: 'awaiting_proof', page: 1 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('queue=awaiting_proof');
    expect(url).not.toContain('filters%5Bqueue%5D');
  });

  it('fetches registration queue counts', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          awaiting_proof: 1,
          refund_pending: 2,
          abandoned_netopia: 3,
        },
      }),
    });
    const api = new EventRegistrationsApiService();
    const res = await api.getRegistrationQueueCounts();
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/registration-queue-counts'
    );
    expect(res.data.awaiting_proof).toBe(1);
  });

  it('creates with omitted event_division_id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_registration: 1 } }),
    });
    const api = new EventRegistrationsApiService();
    await api.createRegistration({
      event_id: 9,
      player_id: 3,
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/event-registrations'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      event_id: 9,
      player_id: 3,
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty(
      'event_division_id'
    );
  });

  it('creates with null event_division_id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_registration: 2 } }),
    });
    const api = new EventRegistrationsApiService();
    await api.createRegistration({
      event_id: 9,
      player_id: 3,
      event_division_id: null,
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      event_id: 9,
      player_id: 3,
      event_division_id: null,
    });
  });

  it('cancels with a locked cancel_reason', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_registration: 5 } }),
    });
    const api = new EventRegistrationsApiService();
    await api.cancelRegistration(5, 'injury_or_illness');
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/event-registrations/5/cancel'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      cancel_reason: 'injury_or_illness',
    });
  });

  it('declines with a locked decline_reason', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_registration: 6 } }),
    });
    const api = new EventRegistrationsApiService();
    await api.declineRegistration(6, 'payment_not_completed');
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/event-registrations/6/decline'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      decline_reason: 'payment_not_completed',
    });
  });

  it('marks refunded without a body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_registration: 7 } }),
    });
    const api = new EventRegistrationsApiService();
    await api.markRegistrationRefunded(7);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/event-registrations/7/mark-refunded'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it('exposes the locked cancel and decline reason enums', () => {
    expect(REGISTRATION_CANCEL_REASONS.map(r => r.value)).toEqual([
      'change_of_plans',
      'schedule_conflict',
      'injury_or_illness',
      'travel_issue',
      'personal_reasons',
      'other',
    ]);
    expect(REGISTRATION_DECLINE_REASONS.map(r => r.value)).toEqual([
      'payment_not_completed',
      'invalid_payment',
      'ineligible',
      'skill_mismatch',
      'false_information',
      'misconduct',
      'administrative',
      'other',
    ]);
  });

  it('no longer exposes hard delete helpers', () => {
    const api = new EventRegistrationsApiService() as any;
    expect(api.deleteRegistration).toBeUndefined();
    expect(api.bulkDeleteRegistrations).toBeUndefined();
  });
});
