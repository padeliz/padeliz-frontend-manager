import { ApiEditionLottery } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EditionLotteriesApiService extends BaseApiService {
  /**
   * Get paginated list of lotteries
   */
  async getLotteries(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        name?: string;
        edition_id?: number;
        display_order?: number;
      };
      sort_by?: {
        name?: 'asc' | 'desc';
        edition_id?: 'asc' | 'desc';
        display_order?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEditionLottery[]; meta: any }> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(`filters[${key}]`, value.toString());
        }
      });
    }
    if (params.sort_by) {
      Object.entries(params.sort_by).forEach(([key, value]) => {
        if (value) {
          queryParams.append(`sort_by[${key}]`, value);
        }
      });
    }

    const endpoint = `/edition-lotteries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEditionLottery[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific lottery by ID
   */
  async getLottery(id: number): Promise<{ data: ApiEditionLottery }> {
    return this.get<{ data: ApiEditionLottery }>(`/edition-lotteries/${id}`);
  }

  /**
   * Create a new lottery
   */
  async createLottery(
    data: Partial<ApiEditionLottery>
  ): Promise<{ data: ApiEditionLottery }> {
    return this.post<{ data: ApiEditionLottery }>('/edition-lotteries', data);
  }

  /**
   * Update an existing lottery
   */
  async updateLottery(
    id: number,
    data: Partial<ApiEditionLottery>
  ): Promise<{ data: ApiEditionLottery }> {
    return this.put<{ data: ApiEditionLottery }>(
      `/edition-lotteries/${id}`,
      data
    );
  }

  /**
   * Delete a lottery
   */
  async deleteLottery(id: number): Promise<void> {
    return this.delete(`/edition-lotteries/${id}`);
  }

  /**
   * Bulk delete lotteries
   */
  async bulkDeleteLotteries(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/edition-lotteries/bulk',
      {
        lottery_ids: ids,
      }
    );
  }
}
