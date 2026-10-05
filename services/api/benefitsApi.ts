import { ApiBenefitDefinition } from '@/types/api/entities';
import { BaseApiService } from './baseApi';

export type BenefitDefinitionPayload = Partial<
  Omit<ApiBenefitDefinition, 'id_benefit' | 'inserted_at' | 'updated_at' | 'is_system'>
> & {
  conditions?: Array<{
    condition_type: string;
    parameters?: Record<string, unknown> | null;
  }>;
  event_ids?: number[];
};

export class BenefitsApiService extends BaseApiService {
  async getBenefits(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        is_active?: boolean | number;
        is_system?: boolean | number;
        amount_type?: string;
        scope_type?: string;
        club_id?: number;
        exclusivity?: string;
        player_optional?: boolean | number;
        stack_group?: string;
      };
      sort_by?: {
        id_benefit?: 'asc' | 'desc';
        slug?: 'asc' | 'desc';
        name?: 'asc' | 'desc';
        is_active?: 'asc' | 'desc';
        amount_type?: 'asc' | 'desc';
        amount_value?: 'asc' | 'desc';
        scope_type?: 'asc' | 'desc';
        priority?: 'asc' | 'desc';
        exclusivity?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiBenefitDefinition[]; meta: any }> {
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

    const endpoint = `/benefit-definitions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiBenefitDefinition[]; meta: any }>(endpoint);
  }

  async getBenefit(id: number): Promise<{ data: ApiBenefitDefinition }> {
    return this.get<{ data: ApiBenefitDefinition }>(`/benefit-definitions/${id}`);
  }

  async createBenefit(
    data: BenefitDefinitionPayload
  ): Promise<{ data: ApiBenefitDefinition }> {
    return this.post<{ data: ApiBenefitDefinition }>('/benefit-definitions', data);
  }

  async updateBenefit(
    id: number,
    data: BenefitDefinitionPayload
  ): Promise<{ data: ApiBenefitDefinition }> {
    return this.put<{ data: ApiBenefitDefinition }>(`/benefit-definitions/${id}`, data);
  }

  async deleteBenefit(id: number): Promise<void> {
    return this.delete(`/benefit-definitions/${id}`);
  }
}
