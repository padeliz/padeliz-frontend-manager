import { ApiPrizeFromClub } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class PrizesFromClubsApiService extends BaseApiService {
  async getPrizeFromClubs(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number | boolean | undefined>;
      sort_by?: Record<string, 'asc' | 'desc' | undefined>;
    } = {}
  ): Promise<{ data: ApiPrizeFromClub[]; meta: any }> {
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
        if (value) queryParams.append(`sort_by[${key}]`, value);
      });
    }
    const endpoint = `/prize-from-clubs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiPrizeFromClub[]; meta: any }>(endpoint);
  }

  async getPrizeFromClub(id: number): Promise<{ data: ApiPrizeFromClub }> {
    return this.get<{ data: ApiPrizeFromClub }>(`/prize-from-clubs/${id}`);
  }

  async createPrizeFromClub(
    data: Partial<ApiPrizeFromClub>
  ): Promise<{ data: ApiPrizeFromClub }> {
    return this.post<{ data: ApiPrizeFromClub }>('/prize-from-clubs', data);
  }

  async updatePrizeFromClub(
    id: number,
    data: Partial<ApiPrizeFromClub>
  ): Promise<{ data: ApiPrizeFromClub }> {
    return this.put<{ data: ApiPrizeFromClub }>(
      `/prize-from-clubs/${id}`,
      data
    );
  }

  async deletePrizeFromClub(id: number): Promise<void> {
    return this.delete(`/prize-from-clubs/${id}`);
  }

  async bulkDeletePrizeFromClubs(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/prize-from-clubs/bulk',
      { prize_from_club_ids: ids }
    );
  }
}

export const prizesFromClubsApi = new PrizesFromClubsApiService();
