import { ApiEditionLotteryPrize } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EditionLotteryPrizesApiService extends BaseApiService {
  async getLotteryPrizes(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      include?: string;
      edition_division_id?: number | null;
      filters?: {
        lottery_id?: number;
        prize_id?: number;
        sponsor_id?: number;
        prize_quantity?: number;
        display_order?: number;
      };
      sort_by?: {
        lottery_id?: 'asc' | 'desc';
        prize_id?: 'asc' | 'desc';
        sponsor_id?: 'asc' | 'desc';
        prize_quantity?: 'asc' | 'desc';
        display_order?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEditionLotteryPrize[]; meta: any }> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.include) queryParams.append('include', params.include);
    if (params.edition_division_id != null) {
      queryParams.append(
        'edition_division_id',
        params.edition_division_id.toString()
      );
    }
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

    const endpoint = `/edition-lottery-prizes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEditionLotteryPrize[]; meta: any }>(endpoint);
  }

  async getLotteryPrize(id: number): Promise<{ data: ApiEditionLotteryPrize }> {
    return this.get<{ data: ApiEditionLotteryPrize }>(
      `/edition-lottery-prizes/${id}`
    );
  }

  async createLotteryPrize(
    data: Partial<ApiEditionLotteryPrize>
  ): Promise<{ data: ApiEditionLotteryPrize }> {
    return this.post<{ data: ApiEditionLotteryPrize }>(
      '/edition-lottery-prizes',
      data
    );
  }

  async updateLotteryPrize(
    id: number,
    data: Partial<ApiEditionLotteryPrize>
  ): Promise<{ data: ApiEditionLotteryPrize }> {
    return this.put<{ data: ApiEditionLotteryPrize }>(
      `/edition-lottery-prizes/${id}`,
      data
    );
  }

  async deleteLotteryPrize(id: number): Promise<void> {
    return this.delete(`/edition-lottery-prizes/${id}`);
  }

  async bulkDeleteLotteryPrizes(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/edition-lottery-prizes/bulk',
      { lottery_prize_ids: ids }
    );
  }
}

export const editionLotteryPrizesApi = new EditionLotteryPrizesApiService();
