import { ApiEventLottery } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EventLotteriesApiService extends BaseApiService {
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
        event_id?: number;
        display_order?: number;
      };
      sort_by?: {
        name?: 'asc' | 'desc';
        event_id?: 'asc' | 'desc';
        display_order?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEventLottery[]; meta: any }> {
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

    const endpoint = `/event-lotteries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEventLottery[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific lottery by ID
   */
  async getLottery(id: number): Promise<{ data: ApiEventLottery }> {
    return this.get<{ data: ApiEventLottery }>(`/event-lotteries/${id}`);
  }

  /**
   * Create a new lottery
   */
  async createLottery(
    data: Partial<ApiEventLottery>
  ): Promise<{ data: ApiEventLottery }> {
    return this.post<{ data: ApiEventLottery }>('/event-lotteries', data);
  }

  /**
   * Update an existing lottery
   */
  async updateLottery(
    id: number,
    data: Partial<ApiEventLottery>
  ): Promise<{ data: ApiEventLottery }> {
    return this.put<{ data: ApiEventLottery }>(
      `/event-lotteries/${id}`,
      data
    );
  }

  /**
   * Delete a lottery
   */
  async deleteLottery(id: number): Promise<void> {
    return this.delete(`/event-lotteries/${id}`);
  }

  /**
   * Generate or recreate balanced rules for a lottery.
   */
  async generateRules(
    lotteryId: number
  ): Promise<{ data: unknown; message?: string }> {
    return this.post<{ data: unknown; message?: string }>(
      `/event-lotteries/${lotteryId}/rules/generate`
    );
  }

  /**
   * Bulk delete lotteries
   */
  async bulkDeleteLotteries(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/event-lotteries/bulk',
      {
        lottery_ids: ids,
      }
    );
  }
}
