import { EditionRegistrationsApiService } from '@/services/api/editionRegistrationsApi';
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

describe('EditionRegistrationsApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('lists registrations under /edition-registrations', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], meta: {} }),
    });
    const api = new EditionRegistrationsApiService();
    await api.getRegistrations({
      filters: { edition_id: 4 },
      sort_by: { inserted_at: 'desc' },
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/v1/manager/edition-registrations');
    expect(url).toContain('filters%5Bedition_id%5D=4');
    expect(url).toContain('sort_by%5Binserted_at%5D=desc');
  });

  it('creates with omitted edition_division_id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_registration: 1 } }),
    });
    const api = new EditionRegistrationsApiService();
    await api.createRegistration({
      edition_id: 9,
      player_id: 3,
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/edition-registrations'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      edition_id: 9,
      player_id: 3,
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty(
      'edition_division_id'
    );
  });

  it('creates with null edition_division_id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_registration: 2 } }),
    });
    const api = new EditionRegistrationsApiService();
    await api.createRegistration({
      edition_id: 9,
      player_id: 3,
      edition_division_id: null,
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      edition_id: 9,
      player_id: 3,
      edition_division_id: null,
    });
  });
});
