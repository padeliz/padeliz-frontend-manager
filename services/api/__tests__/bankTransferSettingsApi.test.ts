import { BankTransferSettingsApiService } from '@/services/api/bankTransferSettingsApi';
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

describe('BankTransferSettingsApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
  });

  it('reads settings and tolerates a null payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });
    const api = new BankTransferSettingsApiService();
    const response = await api.getSettings();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:8000/api/v1/manager/bank-transfer-settings'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
    expect(response.data).toBeNull();
  });

  it('saves settings with PUT', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id_bank_transfer_settings: 1, iban: 'RO49', beneficiary_name: 'Padeliz' },
      }),
    });
    const api = new BankTransferSettingsApiService();
    await api.updateSettings({
      iban: 'RO49',
      beneficiary_name: 'Padeliz',
      bank_name: null,
      payment_reference_template: 'PAD-{checkout_id}',
      extra_instructions: null,
    });
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      iban: 'RO49',
      beneficiary_name: 'Padeliz',
      bank_name: null,
      payment_reference_template: 'PAD-{checkout_id}',
      extra_instructions: null,
    });
  });
});
