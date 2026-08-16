import { ApiEditionLotteryRule } from '@/types/api/edition';
import { ApiBulkDeleteResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class EditionLotteryRulesApiService extends BaseApiService {
  async getRules(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number | boolean | undefined>;
      sort_by?: Record<string, 'asc' | 'desc' | undefined>;
      with_luckies?: boolean;
    } = {}
  ): Promise<{ data: ApiEditionLotteryRule[]; meta: any }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.with_luckies) queryParams.append('with_luckies', '1');
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
    const endpoint = `/edition-lottery-rules${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEditionLotteryRule[]; meta: any }>(endpoint);
  }

  async getRule(id: number): Promise<{ data: ApiEditionLotteryRule }> {
    return this.get<{ data: ApiEditionLotteryRule }>(
      `/edition-lottery-rules/${id}`
    );
  }

  async createRule(
    data: Partial<ApiEditionLotteryRule>
  ): Promise<{ data: ApiEditionLotteryRule }> {
    return this.post<{ data: ApiEditionLotteryRule }>(
      '/edition-lottery-rules',
      data
    );
  }

  async updateRule(
    id: number,
    data: Partial<ApiEditionLotteryRule>
  ): Promise<{ data: ApiEditionLotteryRule }> {
    return this.put<{ data: ApiEditionLotteryRule }>(
      `/edition-lottery-rules/${id}`,
      data
    );
  }

  async deleteRule(id: number): Promise<void> {
    return this.delete(`/edition-lottery-rules/${id}`);
  }

  async bulkDeleteRules(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/edition-lottery-rules/bulk',
      { lottery_rule_ids: ids }
    );
  }
}

export const editionLotteryRulesApi = new EditionLotteryRulesApiService();
