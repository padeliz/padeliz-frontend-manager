import { ApiEventLuckyOne } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EventLuckyOnesApiService extends BaseApiService {
  /**
   * Get paginated list of lucky ones
   */
  async getLuckyOnes(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_user_id?: number;
        event_id?: number;
        lottery_id?: number;
      };
      sort_by?: {
        player_user_id?: 'asc' | 'desc';
        event_id?: 'asc' | 'desc';
        lottery_id?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEventLuckyOne[]; meta: any }> {
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

    const endpoint = `/event-lottery-luckies${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEventLuckyOne[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific lucky one by ID
   */
  async getLuckyOne(id: number): Promise<{ data: ApiEventLuckyOne }> {
    return this.get<{ data: ApiEventLuckyOne }>(
      `/event-lottery-luckies/${id}`
    );
  }

  /**
   * Create a new lucky one
   */
  async createLuckyOne(
    data: Partial<ApiEventLuckyOne>
  ): Promise<{ data: ApiEventLuckyOne }> {
    return this.post<{ data: ApiEventLuckyOne }>(
      '/event-lottery-luckies',
      data
    );
  }

  /**
   * Update an existing lucky one
   */
  async updateLuckyOne(
    id: number,
    data: Partial<ApiEventLuckyOne>
  ): Promise<{ data: ApiEventLuckyOne }> {
    return this.put<{ data: ApiEventLuckyOne }>(
      `/event-lottery-luckies/${id}`,
      data
    );
  }

  /**
   * Delete a lucky one
   */
  async deleteLuckyOne(id: number): Promise<void> {
    return this.delete(`/event-lottery-luckies/${id}`);
  }

  /**
   * Bulk delete lucky ones
   */
  async bulkDeleteLuckyOnes(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/event-lottery-luckies/bulk',
      {
        lucky_ids: ids,
      }
    );
  }
}
