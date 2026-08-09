import { ApiEditionDivision } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EditionDivisionsApiService extends BaseApiService {
  /**
   * Get paginated list of edition divisions
   */
  async getEditionDivisions(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        edition_id?: number;
        division_id?: number;
      };
      sort_by?: {
        edition_id?: 'asc' | 'desc';
        division_id?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEditionDivision[]; meta: any }> {
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

    const endpoint = `/edition-divisions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEditionDivision[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific edition division by ID
   */
  async getEditionDivision(id: number): Promise<{ data: ApiEditionDivision }> {
    return this.get<{ data: ApiEditionDivision }>(`/edition-divisions/${id}`);
  }

  /**
   * Create a new edition division
   */
  async createEditionDivision(
    data: Partial<ApiEditionDivision>
  ): Promise<{ data: ApiEditionDivision }> {
    return this.post<{ data: ApiEditionDivision }>('/edition-divisions', data);
  }

  /**
   * Update an existing edition division
   */
  async updateEditionDivision(
    id: number,
    data: Partial<ApiEditionDivision>
  ): Promise<{ data: ApiEditionDivision }> {
    return this.put<{ data: ApiEditionDivision }>(
      `/edition-divisions/${id}`,
      data
    );
  }

  /**
   * Delete an edition division
   */
  async deleteEditionDivision(id: number): Promise<void> {
    return this.delete(`/edition-divisions/${id}`);
  }

  /**
   * Bulk delete multiple edition divisions
   */
  async bulkDeleteEditionDivisions(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/edition-divisions/bulk',
      {
        edition_division_ids: ids,
      }
    );
  }
}
