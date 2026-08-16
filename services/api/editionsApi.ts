import { ApiEdition } from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EditionsApiService extends BaseApiService {
  /**
   * Get paginated list of editions
   */
  async getEditions(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        name?: string;
        location_id?: number;
        date?: string;
        entry_fee?: number;
        students_entry_fee?: number;
      };
      sort_by?: {
        name?: 'asc' | 'desc';
        date?: 'asc' | 'desc';
        location_id?: 'asc' | 'desc';
        entry_fee?: 'asc' | 'desc';
        students_entry_fee?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<ApiPaginatedResponse<ApiEdition[]>> {
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

    const endpoint = `/editions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiEdition[]>>(endpoint);
  }

  /**
   * Get a specific edition by ID
   */
  async getEdition(id: number): Promise<{ data: ApiEdition }> {
    return this.get<{ data: ApiEdition }>(`/editions/${id}`);
  }

  /**
   * Create a new edition
   */
  async createEdition(
    editionData: Partial<ApiEdition>
  ): Promise<{ data: ApiEdition }> {
    return this.post<{ data: ApiEdition }>('/editions', editionData);
  }

  /**
   * Update an existing edition
   */
  async updateEdition(
    id: number,
    editionData: Partial<ApiEdition>
  ): Promise<{ data: ApiEdition }> {
    return this.put<{ data: ApiEdition }>(`/editions/${id}`, editionData);
  }

  /**
   * Delete an edition
   */
  async deleteEdition(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(
      `/editions/${id}`
    );
  }

  /**
   * Bulk delete editions
   */
  async bulkDeleteEditions(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/editions/bulk',
      {
        edition_ids: ids,
      }
    );
  }

  /**
   * Get editions metadata
   */
  async getMetadata(): Promise<{ data: any }> {
    const { ApiResourceMetadataApiService } = await import(
      './resourceMetadataApi'
    );
    const metadataApi = new ApiResourceMetadataApiService();
    const response = await metadataApi.getApiResourceMetadata('Edition');
    return { data: response.data };
  }

  /**
   * Finalize an edition (irreversible)
   */
  async finalizeEdition(
    id: number
  ): Promise<{ data: ApiEdition; message?: string }> {
    return this.post<{ data: ApiEdition; message?: string }>(
      `/editions/${id}/finalize`
    );
  }
}
