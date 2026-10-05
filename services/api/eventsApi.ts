import { ApiEvent } from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EventsApiService extends BaseApiService {
  /**
   * Get paginated list of events
   */
  async getEvents(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        name?: string;
        location_id?: number;
        date?: string;
      };
      sort_by?: {
        name?: 'asc' | 'desc';
        date?: 'asc' | 'desc';
        location_id?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<ApiPaginatedResponse<ApiEvent[]>> {
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

    const endpoint = `/events${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiEvent[]>>(endpoint);
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(id: number): Promise<{ data: ApiEvent }> {
    return this.get<{ data: ApiEvent }>(`/events/${id}`);
  }

  /**
   * Create a new event
   */
  async createEvent(
    eventData: Partial<ApiEvent>
  ): Promise<{ data: ApiEvent }> {
    return this.post<{ data: ApiEvent }>('/events', eventData);
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    id: number,
    eventData: Partial<ApiEvent>
  ): Promise<{ data: ApiEvent }> {
    return this.put<{ data: ApiEvent }>(`/events/${id}`, eventData);
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(
      `/events/${id}`
    );
  }

  /**
   * Bulk delete events
   */
  async bulkDeleteEvents(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/events/bulk',
      {
        event_ids: ids,
      }
    );
  }

  /**
   * Get events metadata
   */
  async getMetadata(): Promise<{ data: any }> {
    const { ApiResourceMetadataApiService } = await import(
      './resourceMetadataApi'
    );
    const metadataApi = new ApiResourceMetadataApiService();
    const response = await metadataApi.getApiResourceMetadata('Event');
    return { data: response.data };
  }

  /**
   * Finalize an event (irreversible)
   */
  async finalizeEvent(
    id: number
  ): Promise<{ data: ApiEvent; message?: string }> {
    return this.post<{ data: ApiEvent; message?: string }>(
      `/events/${id}/finalize`
    );
  }
}
