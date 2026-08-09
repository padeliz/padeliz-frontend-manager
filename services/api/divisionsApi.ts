import { ApiDivision } from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class DivisionsApiService extends BaseApiService {
  /**
   * Get paginated list of divisions
   */
  async getDivisions(
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
  ): Promise<ApiPaginatedResponse<ApiDivision[]>> {
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

    const endpoint = `/divisions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiDivision[]>>(endpoint);
  }

  /**
   * Get a specific division by ID
   */
  async getDivision(id: number): Promise<{ data: ApiDivision }> {
    return this.get<{ data: ApiDivision }>(`/divisions/${id}`);
  }

  /**
   * Create a new division
   */
  async createDivision(
    data: Partial<ApiDivision>
  ): Promise<{ data: ApiDivision }> {
    return this.post<{ data: ApiDivision }>('/divisions', data);
  }

  /**
   * Update an existing division
   */
  async updateDivision(
    id: number,
    data: Partial<ApiDivision>
  ): Promise<{ data: ApiDivision }> {
    return this.put<{ data: ApiDivision }>(`/divisions/${id}`, data);
  }

  /**
   * Delete a division
   */
  async deleteDivision(id: number): Promise<void> {
    return this.delete(`/divisions/${id}`);
  }

  /**
   * Bulk delete multiple divisions
   */
  async bulkDeleteDivisions(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/divisions/bulk',
      {
        division_ids: ids,
      }
    );
  }

  /**
   * Get divisions metadata
   */
  async getMetadata(): Promise<{ data: any }> {
    const { ApiResourceMetadataApiService } = await import(
      './resourceMetadataApi'
    );
    const metadataApi = new ApiResourceMetadataApiService();
    const response = await metadataApi.getApiResourceMetadata('Division');
    return { data: response.data };
  }
}
