import { ApiEventLotteryRule } from '@/types/api/event';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EventLotteryRulesApiService extends BaseApiService {
  async getRules(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        lottery_id?: number;
        lottery_prize_id?: number;
        event_division_id?: number;
        gender?: string;
        has_social_status?: string | boolean;
        legal_age?: string | boolean;
      };
      sort_by?: Record<string, 'asc' | 'desc' | undefined>;
    } = {}
  ): Promise<{ data: ApiEventLotteryRule[]; meta: any }> {
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
    const endpoint = `/event-lottery-rules${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEventLotteryRule[]; meta: any }>(endpoint);
  }

  async getRule(id: number): Promise<{ data: ApiEventLotteryRule }> {
    return this.get<{ data: ApiEventLotteryRule }>(
      `/event-lottery-rules/${id}`
    );
  }

  async createRule(
    data: Partial<ApiEventLotteryRule>
  ): Promise<{ data: ApiEventLotteryRule }> {
    return this.post<{ data: ApiEventLotteryRule }>(
      '/event-lottery-rules',
      data
    );
  }

  async updateRule(
    id: number,
    data: Partial<ApiEventLotteryRule>
  ): Promise<{ data: ApiEventLotteryRule }> {
    return this.put<{ data: ApiEventLotteryRule }>(
      `/event-lottery-rules/${id}`,
      data
    );
  }

  async patchRule(
    id: number,
    data: Partial<ApiEventLotteryRule>
  ): Promise<{ data: ApiEventLotteryRule }> {
    return this.patch<{ data: ApiEventLotteryRule }>(
      `/event-lottery-rules/${id}`,
      data
    );
  }

  async reorderLotteryRules(
    lotteryId: number,
    lotteryRuleIds: number[]
  ): Promise<{ data: ApiEventLotteryRule[] }> {
    return this.post<{ data: ApiEventLotteryRule[] }>(
      '/event-lottery-rules/reorder',
      {
        lottery_id: lotteryId,
        lottery_rule_ids: lotteryRuleIds,
      }
    );
  }

  async deleteRule(id: number): Promise<void> {
    return this.delete(`/event-lottery-rules/${id}`);
  }

  async bulkDeleteRules(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/event-lottery-rules/bulk',
      { lottery_rule_ids: ids }
    );
  }
}

export const eventLotteryRulesApi = new EventLotteryRulesApiService();
