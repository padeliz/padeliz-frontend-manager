import { ApiSponsor } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class SponsorsApiService extends BaseApiService {
  async getSponsors(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        name?: string;
        club_id?: number;
      };
      sort_by?: {
        name?: 'asc' | 'desc';
        club_id?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiSponsor[]; meta: any }> {
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

    const endpoint = `/sponsors${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiSponsor[]; meta: any }>(endpoint);
  }

  async getSponsor(id: number): Promise<{ data: ApiSponsor }> {
    return this.get<{ data: ApiSponsor }>(`/sponsors/${id}`);
  }

  async createSponsor(data: Partial<ApiSponsor>): Promise<{ data: ApiSponsor }> {
    return this.post<{ data: ApiSponsor }>('/sponsors', data);
  }

  async updateSponsor(
    id: number,
    data: Partial<ApiSponsor>
  ): Promise<{ data: ApiSponsor }> {
    return this.put<{ data: ApiSponsor }>(`/sponsors/${id}`, data);
  }

  async deleteSponsor(id: number): Promise<void> {
    return this.delete(`/sponsors/${id}`);
  }

  async bulkDeleteSponsors(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>('/sponsors/bulk', {
      sponsor_ids: ids,
    });
  }
}
