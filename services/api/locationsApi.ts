import { ApiLocation } from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class LocationsApiService extends BaseApiService {
  /**
   * Get paginated list of locations
   */
  async getLocations(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        name?: string;
        address?: string;
        club_id?: number;
        total_indoors_courts?: number;
        total_outdoor_courts?: number;
      };
      sort_by?: {
        name?: 'asc' | 'desc';
        address?: 'asc' | 'desc';
        club_id?: 'asc' | 'desc';
        total_indoors_courts?: 'asc' | 'desc';
        total_outdoor_courts?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<ApiPaginatedResponse<ApiLocation[]>> {
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

    const endpoint = `/locations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiLocation[]>>(endpoint);
  }

  /**
   * Get a specific location by ID
   */
  async getLocation(id: number): Promise<{ data: Location }> {
    return this.get<{ data: Location }>(`/locations/${id}`);
  }

  /**
   * Create a new location
   */
  async createLocation(
    locationData: Partial<Location>
  ): Promise<{ data: Location }> {
    return this.post<{ data: Location }>('/locations', locationData);
  }

  /**
   * Update an existing location
   */
  async updateLocation(
    id: number,
    locationData: Partial<Location>
  ): Promise<{ data: Location }> {
    return this.put<{ data: Location }>(`/locations/${id}`, locationData);
  }

  /**
   * Delete a location
   */
  async deleteLocation(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(
      `/locations/${id}`
    );
  }

  /**
   * Bulk delete locations
   */
  async bulkDeleteLocations(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/locations/bulk',
      {
        location_ids: ids,
      }
    );
  }

  /**
   * Get locations metadata
   */
  async getMetadata(): Promise<{ data: any }> {
    const { ApiResourceMetadataApiService } = await import(
      './resourceMetadataApi'
    );
    const metadataApi = new ApiResourceMetadataApiService();
    const response = await metadataApi.getApiResourceMetadata('Location');
    return { data: response.data };
  }
}
