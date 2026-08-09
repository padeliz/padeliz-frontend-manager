import { ApiPlayerEligibility } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class PlayerEligibilitiesApiService extends BaseApiService {
  /**
   * Get paginated list of player eligibilities
   */
  async getPlayerEligibilities(
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
  ): Promise<{ data: ApiPlayerEligibility[]; meta: any }> {
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

    const endpoint = `/player-eligibilities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiPlayerEligibility[]; meta: any }>(endpoint);
  }

  /**
   * Get a specific player eligibility by ID
   */
  async getPlayerEligibility(
    id: number
  ): Promise<{ data: ApiPlayerEligibility }> {
    return this.get<{ data: ApiPlayerEligibility }>(
      `/player-eligibilities/${id}`
    );
  }

  /**
   * Create a new player eligibility
   */
  async createPlayerEligibility(
    data: Partial<ApiPlayerEligibility>
  ): Promise<{ data: ApiPlayerEligibility }> {
    return this.post<{ data: ApiPlayerEligibility }>(
      '/player-eligibilities',
      data
    );
  }

  /**
   * Update an existing player eligibility
   */
  async updatePlayerEligibility(
    id: number,
    data: Partial<ApiPlayerEligibility>
  ): Promise<{ data: ApiPlayerEligibility }> {
    return this.put<{ data: ApiPlayerEligibility }>(
      `/player-eligibilities/${id}`,
      data
    );
  }

  /**
   * Delete an player eligibility
   */
  async deletePlayerEligibility(id: number): Promise<void> {
    return this.delete(`/player-eligibilities/${id}`);
  }

  /**
   * Bulk delete player eligibilities
   */
  async bulkDeletePlayerEligibilities(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/player-eligibilities/bulk',
      {
        player_eligibility_ids: ids,
      }
    );
  }
}
