import { ApiEditionRegistration } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EditionRegistrationsApiService extends BaseApiService {
  async getRegistrations(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_id?: number;
        edition_id?: number;
        edition_division_id?: number | null;
      };
      sort_by?: {
        player_id?: 'asc' | 'desc';
        edition_id?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEditionRegistration[]; meta: any }> {
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
        if (value) {
          queryParams.append(`sort_by[${key}]`, value);
        }
      });
    }

    const endpoint = `/edition-registrations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEditionRegistration[]; meta: any }>(endpoint);
  }

  async getRegistration(
    id: number
  ): Promise<{ data: ApiEditionRegistration }> {
    return this.get<{ data: ApiEditionRegistration }>(
      `/edition-registrations/${id}`
    );
  }

  async createRegistration(
    data: Partial<ApiEditionRegistration>
  ): Promise<{ data: ApiEditionRegistration }> {
    return this.post<{ data: ApiEditionRegistration }>(
      `/edition-registrations`,
      data
    );
  }

  async updateRegistration(
    id: number,
    data: Partial<ApiEditionRegistration>
  ): Promise<{ data: ApiEditionRegistration }> {
    return this.put<{ data: ApiEditionRegistration }>(
      `/edition-registrations/${id}`,
      data
    );
  }

  async deleteRegistration(id: number): Promise<void> {
    return this.delete(`/edition-registrations/${id}`);
  }

  async bulkDeleteRegistrations(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/edition-registrations/bulk',
      {
        registration_ids: ids,
      }
    );
  }
}
