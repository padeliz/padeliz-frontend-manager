import { ApiEventLotteryPrize } from '@/types/api/entities';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EventLotteryPrizesApiService extends BaseApiService {
  async getLotteryPrizes(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      include?: string;
      event_division_id?: number | null;
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
  ): Promise<{ data: ApiEventLotteryPrize[]; meta: any }> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.include) queryParams.append('include', params.include);
    if (params.event_division_id != null) {
      queryParams.append(
        'event_division_id',
        params.event_division_id.toString()
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

    const endpoint = `/event-lottery-prizes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEventLotteryPrize[]; meta: any }>(endpoint);
  }

  async getLotteryPrize(id: number): Promise<{ data: ApiEventLotteryPrize }> {
    return this.get<{ data: ApiEventLotteryPrize }>(
      `/event-lottery-prizes/${id}`
    );
  }

  async createLotteryPrize(
    data: Partial<ApiEventLotteryPrize>
  ): Promise<{ data: ApiEventLotteryPrize }> {
    return this.post<{ data: ApiEventLotteryPrize }>(
      '/event-lottery-prizes',
      data
    );
  }

  async updateLotteryPrize(
    id: number,
    data: Partial<ApiEventLotteryPrize>
  ): Promise<{ data: ApiEventLotteryPrize }> {
    return this.put<{ data: ApiEventLotteryPrize }>(
      `/event-lottery-prizes/${id}`,
      data
    );
  }

  async patchLotteryPrize(
    id: number,
    data: Partial<ApiEventLotteryPrize>
  ): Promise<{ data: ApiEventLotteryPrize }> {
    return this.patch<{ data: ApiEventLotteryPrize }>(
      `/event-lottery-prizes/${id}`,
      data
    );
  }

  async reorderLotteryPrizes(
    lotteryId: number,
    lotteryPrizeIds: number[]
  ): Promise<{ data: ApiEventLotteryPrize[] }> {
    return this.post<{ data: ApiEventLotteryPrize[] }>(
      '/event-lottery-prizes/reorder',
      {
        lottery_id: lotteryId,
        lottery_prize_ids: lotteryPrizeIds,
      }
    );
  }

  async deleteLotteryPrize(id: number): Promise<void> {
    return this.delete(`/event-lottery-prizes/${id}`);
  }

  async bulkDeleteLotteryPrizes(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/event-lottery-prizes/bulk',
      { lottery_prize_ids: ids }
    );
  }
}

export const eventLotteryPrizesApi = new EventLotteryPrizesApiService();
