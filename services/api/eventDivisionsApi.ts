import { ApiEventDivision } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EventDivisionsApiService extends BaseApiService {
  /**
   * Get paginated list of event divisions
   */
  async getEventDivisions(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        event_id?: number;
        division_id?: number;
        players_limit?: number;
        skill_order?: number;
      };
      sort_by?: {
        event_id?: 'asc' | 'desc';
        division_id?: 'asc' | 'desc';
        skill_order?: 'asc' | 'desc';
        division_title?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEventDivision[]; meta: any }> {
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
    // Weakest-to-strongest is the expected reading order everywhere in the UI.
    const sortBy = params.sort_by ?? { skill_order: 'asc' as const };
    Object.entries(sortBy).forEach(([key, value]) => {
      if (value) {
        queryParams.append(`sort_by[${key}]`, value);
      }
    });

    const endpoint = `/event-divisions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEventDivision[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific event division by ID
   */
  async getEventDivision(id: number): Promise<{ data: ApiEventDivision }> {
    return this.get<{ data: ApiEventDivision }>(`/event-divisions/${id}`);
  }

  /**
   * Create a new event division
   */
  async createEventDivision(
    data: Partial<ApiEventDivision>
  ): Promise<{ data: ApiEventDivision }> {
    return this.post<{ data: ApiEventDivision }>('/event-divisions', data);
  }

  /**
   * Update an existing event division
   */
  async updateEventDivision(
    id: number,
    data: Partial<ApiEventDivision>
  ): Promise<{ data: ApiEventDivision }> {
    return this.put<{ data: ApiEventDivision }>(
      `/event-divisions/${id}`,
      data
    );
  }

  /**
   * Delete an event division
   */
  async deleteEventDivision(id: number): Promise<void> {
    return this.delete(`/event-divisions/${id}`);
  }

  /**
   * Rewrite skill_order for an event. `divisions` must list every division
   * of the event exactly once.
   */
  async reorderEventDivisions(
    eventId: number,
    divisions: Array<{ id_event_division: number; skill_order: number }>
  ): Promise<{ data: ApiEventDivision[]; message?: string }> {
    return this.patch<{ data: ApiEventDivision[]; message?: string }>(
      '/event-divisions/reorder',
      { event_id: eventId, divisions }
    );
  }

  /**
   * Bulk delete multiple event divisions
   */
  async bulkDeleteEventDivisions(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/event-divisions/bulk',
      {
        event_division_ids: ids,
      }
    );
  }
}
