import { ApiPlayerPhone } from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class PlayerPhonesApiService extends BaseApiService {
  async getPhones(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_id?: number;
        is_primary?: 0 | 1;
      };
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerPhone[]>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(`filters[${key}]`, String(value));
        }
      });
    }
    if (params.sort_by) {
      Object.entries(params.sort_by).forEach(([key, value]) => {
        if (value) queryParams.append(`sort_by[${key}]`, value);
      });
    }
    const endpoint = `/player-phones${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiPlayerPhone[]>>(endpoint);
  }

  async getPhone(id: number): Promise<{ data: ApiPlayerPhone }> {
    return this.get<{ data: ApiPlayerPhone }>(`/player-phones/${id}`);
  }

  async createPhone(
    data: Partial<ApiPlayerPhone>
  ): Promise<{ data: ApiPlayerPhone }> {
    return this.post<{ data: ApiPlayerPhone }>('/player-phones', data);
  }

  async updatePhone(
    id: number,
    data: Partial<ApiPlayerPhone>
  ): Promise<{ data: ApiPlayerPhone }> {
    return this.put<{ data: ApiPlayerPhone }>(`/player-phones/${id}`, data);
  }

  async deletePhone(id: number): Promise<void> {
    return this.delete(`/player-phones/${id}`);
  }

  async bulkDeletePhones(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/player-phones/bulk',
      { player_phone_ids: ids }
    );
  }
}
