import { ApiEditionLuckyOne } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EditionLuckyOnesApiService extends BaseApiService {
  /**
   * Get paginated list of lucky ones
   */
  async getLuckyOnes(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_id?: number;
        edition_id?: number;
        lottery_id?: number;
      };
      sort_by?: {
        player_id?: 'asc' | 'desc';
        edition_id?: 'asc' | 'desc';
        lottery_id?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEditionLuckyOne[]; meta: any }> {
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

    const endpoint = `/edition-lucky-ones${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEditionLuckyOne[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific lucky one by ID
   */
  async getLuckyOne(id: number): Promise<{ data: ApiEditionLuckyOne }> {
    return this.get<{ data: ApiEditionLuckyOne }>(`/edition-lucky-ones/${id}`);
  }

  /**
   * Create a new lucky one
   */
  async createLuckyOne(
    data: Partial<ApiEditionLuckyOne>
  ): Promise<{ data: ApiEditionLuckyOne }> {
    return this.post<{ data: ApiEditionLuckyOne }>('/edition-lucky-ones', data);
  }

  /**
   * Update an existing lucky one
   */
  async updateLuckyOne(
    id: number,
    data: Partial<ApiEditionLuckyOne>
  ): Promise<{ data: ApiEditionLuckyOne }> {
    return this.put<{ data: ApiEditionLuckyOne }>(
      `/edition-lucky-ones/${id}`,
      data
    );
  }

  /**
   * Delete a lucky one
   */
  async deleteLuckyOne(id: number): Promise<void> {
    return this.delete(`/edition-lucky-ones/${id}`);
  }

  /**
   * Bulk delete lucky ones
   */
  async bulkDeleteLuckyOnes(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/edition-lucky-ones/bulk',
      {
        edition_lucky_one_ids: ids,
      }
    );
  }
}
