import { RegistrationPaymentProofsApiService } from '@/services/api/registrationPaymentProofsApi';
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

describe('RegistrationPaymentProofsApiService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    (global as any).fetch = fetchMock;
    (storageUtils.get as jest.Mock).mockResolvedValue('test-token');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id_registration: 1 } }),
    });
  });

  it('approves under /payment-proofs/{id}/approve with an optional message', async () => {
    const api = new RegistrationPaymentProofsApiService();
    await api.approveProof(12, 'Looks good');
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:8000/api/v1/manager/payment-proofs/12/approve'
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      review_message: 'Looks good',
    });
  });

  it('rejects under /payment-proofs/{id}/reject and omits an empty message', async () => {
    const api = new RegistrationPaymentProofsApiService();
    await api.rejectProof(13);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:8000/api/v1/manager/payment-proofs/13/reject'
    );
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });
});
