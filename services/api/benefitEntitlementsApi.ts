import { ApiBenefitEntitlement } from '@/types/api/entities';
import { BaseApiService } from './baseApi';

export type BenefitEntitlementGrantPayload = {
  benefit_definition_id: number;
  player_user_id: number;
  remaining_uses?: number | null;
  valid_from?: number | null;
  valid_until?: number | null;
};

export class BenefitEntitlementsApiService extends BaseApiService {
  async getEntitlements(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        benefit_definition_id?: number;
        player_user_id?: number;
        source_type?: string;
        status?: string;
      };
      sort_by?: {
        id_entitlement?: 'asc' | 'desc';
        benefit_definition_id?: 'asc' | 'desc';
        player_user_id?: 'asc' | 'desc';
        remaining_uses?: 'asc' | 'desc';
        valid_from?: 'asc' | 'desc';
        valid_until?: 'asc' | 'desc';
        source_type?: 'asc' | 'desc';
        status?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiBenefitEntitlement[]; meta: any }> {
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

    const endpoint = `/benefit-entitlements${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    return this.get<{ data: ApiBenefitEntitlement[]; meta: any }>(endpoint);
  }

  async getEntitlement(
    id: number
  ): Promise<{ data: ApiBenefitEntitlement }> {
    return this.get<{ data: ApiBenefitEntitlement }>(
      `/benefit-entitlements/${id}`
    );
  }

  async grantEntitlement(
    data: BenefitEntitlementGrantPayload
  ): Promise<{ data: ApiBenefitEntitlement }> {
    return this.post<{ data: ApiBenefitEntitlement }>(
      '/benefit-entitlements',
      data
    );
  }

  async revokeEntitlement(
    id: number
  ): Promise<{ data: ApiBenefitEntitlement }> {
    return this.post<{ data: ApiBenefitEntitlement }>(
      `/benefit-entitlements/${id}/revoke`
    );
  }

  async extendEntitlement(
    id: number,
    validUntil: number
  ): Promise<{ data: ApiBenefitEntitlement }> {
    return this.patch<{ data: ApiBenefitEntitlement }>(
      `/benefit-entitlements/${id}`,
      { valid_until: validUntil }
    );
  }
}
