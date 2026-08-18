import { ApiSponsorPrize } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class SponsorPrizesApiService extends BaseApiService {
  async getSponsorPrizes(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number | boolean | undefined>;
      sort_by?: Record<string, 'asc' | 'desc' | undefined>;
    } = {}
  ): Promise<{ data: ApiSponsorPrize[]; meta: any }> {
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
    const endpoint = `/sponsor-prizes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiSponsorPrize[]; meta: any }>(endpoint);
  }

  async getSponsorPrize(id: number): Promise<{ data: ApiSponsorPrize }> {
    return this.get<{ data: ApiSponsorPrize }>(`/sponsor-prizes/${id}`);
  }

  async createSponsorPrize(
    data: Partial<ApiSponsorPrize>
  ): Promise<{ data: ApiSponsorPrize }> {
    return this.post<{ data: ApiSponsorPrize }>('/sponsor-prizes', data);
  }

  async updateSponsorPrize(
    id: number,
    data: Partial<ApiSponsorPrize>
  ): Promise<{ data: ApiSponsorPrize }> {
    return this.put<{ data: ApiSponsorPrize }>(`/sponsor-prizes/${id}`, data);
  }

  /**
   * Overlay upsert keyed by (sponsor_id, prize_id): reuse an existing row
   * when present, otherwise create. Unique 422 is the API fallback.
   */
  async upsertSponsorPrize(
    data: Partial<ApiSponsorPrize>
  ): Promise<{ data: ApiSponsorPrize }> {
    const sponsorId = data.sponsor_id;
    const prizeId = data.prize_id;
    if (sponsorId != null && prizeId != null) {
      const existing = await this.getSponsorPrizes({
        per_page: 1,
        filters: { sponsor_id: sponsorId, prize_id: prizeId },
      });
      const row = existing.data?.[0];
      if (row?.id_sponsor_prize != null) {
        return this.updateSponsorPrize(row.id_sponsor_prize, data);
      }
    }
    return this.createSponsorPrize(data);
  }

  async deleteSponsorPrize(id: number): Promise<void> {
    return this.delete(`/sponsor-prizes/${id}`);
  }

  async bulkDeleteSponsorPrizes(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/sponsor-prizes/bulk',
      { sponsor_prize_ids: ids }
    );
  }
}

export const sponsorPrizesApi = new SponsorPrizesApiService();
