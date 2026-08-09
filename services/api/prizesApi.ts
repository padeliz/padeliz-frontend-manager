import { ApiPrize } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class PrizesApiService extends BaseApiService {
  /**
   * Get paginated list of prizes
   */
  async getPrizes(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        name?: string;
        description?: string;
        club_id?: number;
      };
      sort_by?: {
        name?: 'asc' | 'desc';
        description?: 'asc' | 'desc';
        club_id?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiPrize[]; meta: any }> {
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

    const endpoint = `/prizes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiPrize[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific prize by ID
   */
  async getPrize(id: number): Promise<{ data: ApiPrize }> {
    return this.get<{ data: ApiPrize }>(`/prizes/${id}`);
  }

  /**
   * Create a new prize
   */
  async createPrize(data: Partial<ApiPrize>): Promise<{ data: ApiPrize }> {
    return this.post<{ data: ApiPrize }>('/prizes', data);
  }

  /**
   * Update an existing prize
   */
  async updatePrize(
    id: number,
    data: Partial<ApiPrize>
  ): Promise<{ data: ApiPrize }> {
    return this.put<{ data: ApiPrize }>(`/prizes/${id}`, data);
  }

  /**
   * Delete a prize
   */
  async deletePrize(id: number): Promise<void> {
    return this.delete(`/prizes/${id}`);
  }

  /**
   * Bulk delete prizes
   */
  async bulkDeletePrizes(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>('/prizes/bulk', {
      prize_ids: ids,
    });
  }
}
