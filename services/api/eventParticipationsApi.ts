import { ApiEventParticipation } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EventParticipationsApiService extends BaseApiService {
  /**
   * Get paginated list of participations (filters.event_id etc. via params)
   */
  async getParticipations(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_id?: number;
        event_id?: number;
        event_division_id?: number;
        status?: string;
      };
      sort_by?: {
        player_id?: 'asc' | 'desc';
        status?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
        sort_order?: 'asc' | 'desc';
      };
      custom_field_ids?: number[];
    } = {}
  ): Promise<{ data: ApiEventParticipation[]; meta: any }> {
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
    if (params.custom_field_ids?.length) {
      for (const id of params.custom_field_ids) {
        queryParams.append('custom_field_ids[]', String(id));
      }
    }
    if (params.sort_by) {
      Object.entries(params.sort_by).forEach(([key, value]) => {
        if (value) {
          queryParams.append(`sort_by[${key}]`, value);
        }
      });
    }

    const endpoint = `/event-participations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEventParticipation[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific participation by ID
   */
  async getParticipation(
    id: number
  ): Promise<{ data: ApiEventParticipation }> {
    return this.get<{ data: ApiEventParticipation }>(
      `/event-participations/${id}`
    );
  }

  /**
   * Create a new participation
   */
  async createParticipation(
    data: Partial<ApiEventParticipation>
  ): Promise<{ data: ApiEventParticipation }> {
    return this.post<{ data: ApiEventParticipation }>(
      `/event-participations`,
      data
    );
  }

  /**
   * Update an existing participation
   */
  async updateParticipation(
    id: number,
    data: Partial<ApiEventParticipation>
  ): Promise<{ data: ApiEventParticipation }> {
    return this.put<{ data: ApiEventParticipation }>(
      `/event-participations/${id}`,
      data
    );
  }

  /**
   * Delete a participation
   */
  async deleteParticipation(id: number): Promise<void> {
    return this.delete(`/event-participations/${id}`);
  }

  /**
   * Bulk delete participations
   */
  async bulkDeleteParticipations(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/event-participations/bulk',
      {
        event_participation_ids: ids,
      }
    );
  }

  async reorderParticipations(
    participations: Array<{
      id_participation: number;
      event_division_id: number;
      sort_order: number;
    }>
  ): Promise<{ data: ApiEventParticipation[] }> {
    return this.patch<{ data: ApiEventParticipation[] }>(
      '/event-participations/reorder',
      { participations }
    );
  }
}
