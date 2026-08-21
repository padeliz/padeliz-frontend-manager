import { ApiPlayerCustomFieldValue } from '@/types/api/entities';
import { ApiPaginatedResponse, ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export type PlayerCustomFieldValueSubmitPayload = {
  player_custom_field_id: number;
  edition_id?: number | null;
  value?: string | number | boolean | null;
  option_id?: number;
  option_ids?: number[];
};

export class PlayerCustomFieldValuesApiService extends BaseApiService {
  async getValues(
    playerId: number,
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number>;
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerCustomFieldValue[]>> {
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
    const qs = queryParams.toString();
    return this.get(
      `/players/${playerId}/custom-field-values${qs ? `?${qs}` : ''}`
    );
  }

  async getValue(
    playerId: number,
    valueId: number
  ): Promise<ApiResponse<ApiPlayerCustomFieldValue>> {
    return this.get(`/players/${playerId}/custom-field-values/${valueId}`);
  }

  async createValue(
    playerId: number,
    payload: PlayerCustomFieldValueSubmitPayload
  ): Promise<ApiResponse<ApiPlayerCustomFieldValue>> {
    return this.post(`/players/${playerId}/custom-field-values`, payload);
  }

  async invalidateValue(
    playerId: number,
    valueId: number,
    payload: { invalidation_reason?: string } = {}
  ): Promise<ApiResponse<ApiPlayerCustomFieldValue>> {
    return this.post(
      `/players/${playerId}/custom-field-values/${valueId}/invalidate`,
      payload
    );
  }
}
