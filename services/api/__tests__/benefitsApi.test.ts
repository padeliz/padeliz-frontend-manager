/**
 * @jest-environment jsdom
 */
import { BenefitsApiService } from '@/services/api/benefitsApi';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/services/api/baseApi', () => ({
  BaseApiService: class {
    get = (...args: unknown[]) => mockGet(...args);
    post = (...args: unknown[]) => mockPost(...args);
    put = (...args: unknown[]) => mockPut(...args);
    delete = (...args: unknown[]) => mockDelete(...args);
  },
  ApiError: class extends Error {},
}));

describe('BenefitsApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: [], meta: {} });
    mockPost.mockResolvedValue({ data: { id_benefit: 1 } });
    mockPut.mockResolvedValue({ data: { id_benefit: 1 } });
  });

  it('lists and mutates /benefit-definitions', async () => {
    const api = new BenefitsApiService();
    await api.getBenefits({ page: 1, filters: { is_active: 1 } });
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('/benefit-definitions?')
    );
    expect(mockGet.mock.calls[0][0]).toContain('filters%5Bis_active%5D=1');

    await api.createBenefit({ slug: 'x', name: 'X' } as any);
    expect(mockPost).toHaveBeenCalledWith(
      '/benefit-definitions',
      expect.any(Object)
    );

    await api.updateBenefit(3, { name: 'Y' } as any);
    expect(mockPut).toHaveBeenCalledWith(
      '/benefit-definitions/3',
      expect.any(Object)
    );
  });
});
