/**
 * @jest-environment jsdom
 */
import { EditionRegistrationImportApiService } from '@/services/api/editionRegistrationImportApi';
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

describe('EditionRegistrationImportApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('previews via multipart POST to /editions/{id}/registrations/import/preview', async () => {
    const append = jest.fn();
    const originalFormData = global.FormData;
    global.FormData = jest.fn().mockImplementation(() => ({ append })) as any;

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { format: 'playtomic', rows: [] },
        message: 'Preview generated',
      }),
    });

    const api = new EditionRegistrationImportApiService();
    const file = { name: 'regs.csv' } as File;
    await api.preview(7, file);

    expect(append).toHaveBeenCalledWith('file', file);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/editions/7/registrations/import/preview'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');

    global.FormData = originalFormData;
  });

  it('saves JSON to /editions/{id}/registrations/import', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        data: {
          registered: 1,
          skipped_already_registered: 0,
          skipped_unmapped: 0,
          skipped_conflict: 0,
          rows: [],
        },
        message: 'Registrations imported successfully',
      }),
    });

    const api = new EditionRegistrationImportApiService();
    const payload = {
      format: 'playtomic',
      rows: [
        {
          index: 0,
          first_name: 'Mara',
          middle_name: null,
          last_name: 'Popescu',
          email: 'mara@example.test',
          phone: '+40700',
          player_id: 12,
          status: 'mapped',
        },
      ],
    };
    await api.save(7, payload);

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/manager/editions/7/registrations/import'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(payload);
  });
});
