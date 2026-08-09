/**
 * Clubs API Service
 * Handles all club-related API operations
 */

import { ApiClub } from '@/types/api/entities';
import { ApiAdvancedPaginationParams } from '@/types/api/requests';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class ClubsApiService extends BaseApiService {
  /**
   * Get paginated list of clubs with optional search, filters, and sorting
   */
  async getClubs(
    params: ApiAdvancedPaginationParams = {
      page: 1,
      per_page: 10,
    }
  ): Promise<ApiPaginatedResponse<ApiClub[]>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.filters)
      queryParams.append('filters', JSON.stringify(params.filters));
    if (params.sort_by)
      queryParams.append('sort_by', JSON.stringify(params.sort_by));

    const endpoint = `/clubs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiClub[]>>(endpoint);
  }

  /**
   * Get a single club by ID
   */
  async getClub(id: number): Promise<ApiResponse<ApiClub>> {
    return this.get<ApiResponse<ApiClub>>(`/clubs/${id}`);
  }

  /**
   * Create a new club
   */
  async createClub(data: Partial<ApiClub>): Promise<ApiResponse<ApiClub>> {
    return this.post<ApiResponse<ApiClub>>('/clubs', data);
  }

  /**
   * Update an existing club
   */
  async updateClub(
    id: number,
    data: Partial<ApiClub>
  ): Promise<ApiResponse<ApiClub>> {
    return this.put<ApiResponse<ApiClub>>(`/clubs/${id}`, data);
  }

  /**
   * Delete a club
   */
  async deleteClub(id: number): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`/clubs/${id}`);
  }

  /**
   * Bulk delete multiple clubs
   */
  async bulkDeleteClubs(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>('/clubs/bulk', {
      club_ids: ids,
    });
  }

  /**
   * Get clubs metadata
   */
  async getMetadata(): Promise<{ data: any }> {
    const { ApiResourceMetadataApiService } = await import(
      './resourceMetadataApi'
    );
    const metadataApi = new ApiResourceMetadataApiService();
    const response = await metadataApi.getApiResourceMetadata('Club');
    return { data: response.data };
  }
}
