import { ApiCourt } from '@/types/api/event';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class CourtsApiService extends BaseApiService {
  async getCourts(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        location_id?: number;
        name?: string;
        is_indoor?: boolean;
      };
      sort_by?: {
        name?: 'asc' | 'desc';
        location_id?: 'asc' | 'desc';
        display_order?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiCourt[]; meta: any }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(`filters[${key}]`, value.toString());
        }
      });
    }
    if (params.sort_by) {
      Object.entries(params.sort_by).forEach(([key, value]) => {
        if (value) queryParams.append(`sort_by[${key}]`, value);
      });
    }
    const endpoint = `/courts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiCourt[]; meta: any }>(endpoint);
  }

  async getCourt(id: number): Promise<{ data: ApiCourt }> {
    return this.get<{ data: ApiCourt }>(`/courts/${id}`);
  }

  async createCourt(data: Partial<ApiCourt>): Promise<{ data: ApiCourt }> {
    return this.post<{ data: ApiCourt }>('/courts', data);
  }

  async updateCourt(
    id: number,
    data: Partial<ApiCourt>
  ): Promise<{ data: ApiCourt }> {
    return this.put<{ data: ApiCourt }>(`/courts/${id}`, data);
  }

  async deleteCourt(id: number): Promise<void> {
    return this.delete(`/courts/${id}`);
  }

  async bulkDeleteCourts(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>('/courts/bulk', {
      court_ids: ids,
    });
  }
}

export const courtsApi = new CourtsApiService();
