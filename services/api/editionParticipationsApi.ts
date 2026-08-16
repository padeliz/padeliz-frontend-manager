import { ApiEditionParticipation } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EditionParticipationsApiService extends BaseApiService {
  /**
   * Get paginated list of participations (filters.edition_id etc. via params)
   */
  async getParticipations(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_id?: number;
        edition_id?: number;
        edition_division_id?: number;
        status?: string;
      };
      sort_by?: {
        player_id?: 'asc' | 'desc';
        status?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
        sort_order?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEditionParticipation[]; meta: any }> {
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

    const endpoint = `/edition-participations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEditionParticipation[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific participation by ID
   */
  async getParticipation(
    id: number
  ): Promise<{ data: ApiEditionParticipation }> {
    return this.get<{ data: ApiEditionParticipation }>(
      `/edition-participations/${id}`
    );
  }

  /**
   * Create a new participation
   */
  async createParticipation(
    data: Partial<ApiEditionParticipation>
  ): Promise<{ data: ApiEditionParticipation }> {
    return this.post<{ data: ApiEditionParticipation }>(
      `/edition-participations`,
      data
    );
  }

  /**
   * Update an existing participation
   */
  async updateParticipation(
    id: number,
    data: Partial<ApiEditionParticipation>
  ): Promise<{ data: ApiEditionParticipation }> {
    return this.put<{ data: ApiEditionParticipation }>(
      `/edition-participations/${id}`,
      data
    );
  }

  /**
   * Delete a participation
   */
  async deleteParticipation(id: number): Promise<void> {
    return this.delete(`/edition-participations/${id}`);
  }

  /**
   * Bulk delete participations
   */
  async bulkDeleteParticipations(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/edition-participations/bulk',
      {
        edition_participation_ids: ids,
      }
    );
  }

  async reorderParticipations(
    participations: Array<{
      id_participation: number;
      edition_division_id: number;
      sort_order: number;
    }>
  ): Promise<{ data: ApiEditionParticipation[] }> {
    return this.patch<{ data: ApiEditionParticipation[] }>(
      '/edition-participations/reorder',
      { participations }
    );
  }
}
