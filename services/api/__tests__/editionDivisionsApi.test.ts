import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { OrganizersApiService } from '@/services/api/organizersApi';
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

describe('EditionDivisionsApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('lists edition divisions ordered by skill_order by default', async () => {
    const api = new EditionDivisionsApiService();
    await api.getEditionDivisions({ per_page: 100, filters: { edition_id: 3 } });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/v1/manager/edition-divisions?per_page=100&filters%5Bedition_id%5D=3&sort_by%5Bskill_order%5D=asc'
    );
  });

  it('PATCHes skill_order for the whole edition', async () => {
    const api = new EditionDivisionsApiService();
    await api.reorderEditionDivisions(3, [
      { id_edition_division: 10, skill_order: 0 },
      { id_edition_division: 9, skill_order: 1 },
    ]);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/v1/manager/edition-divisions/reorder'
    );
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({
      edition_id: 3,
      divisions: [
        { id_edition_division: 10, skill_order: 0 },
        { id_edition_division: 9, skill_order: 1 },
      ],
    });
  });
});

describe('OrganizersApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('builds organizer CRUD URLs', async () => {
    const api = new OrganizersApiService();
    await api.getOrganizers({ per_page: 50 });
    await api.getOrganizer(2);
    await api.createOrganizer({ name: 'ARSH' });
    await api.updateOrganizer(2, { name: 'ARSH 2' });

    expect(fetchMock.mock.calls.map(c => c[0])).toEqual([
      'http://localhost:8000/api/v1/manager/organizers?per_page=50',
      'http://localhost:8000/api/v1/manager/organizers/2',
      'http://localhost:8000/api/v1/manager/organizers',
      'http://localhost:8000/api/v1/manager/organizers/2',
    ]);
    expect(fetchMock.mock.calls[2][1].method).toBe('POST');
    expect(fetchMock.mock.calls[3][1].method).toBe('PUT');
  });
});
