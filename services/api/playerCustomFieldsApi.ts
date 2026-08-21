import {
  ApiPlayerCustomField,
  ApiPlayerCustomFieldOption,
} from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class PlayerCustomFieldsApiService extends BaseApiService {
  async getPlayerCustomFields(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number | boolean>;
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerCustomField[]>> {
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
    return this.get(`/player-custom-fields${qs ? `?${qs}` : ''}`);
  }

  async getPlayerCustomField(
    id: number
  ): Promise<{ data: ApiPlayerCustomField }> {
    return this.get<{ data: ApiPlayerCustomField }>(
      `/player-custom-fields/${id}`
    );
  }

  async createPlayerCustomField(
    data: Partial<ApiPlayerCustomField>
  ): Promise<{ data: ApiPlayerCustomField }> {
    return this.post<{ data: ApiPlayerCustomField }>(
      '/player-custom-fields',
      data
    );
  }

  async updatePlayerCustomField(
    id: number,
    data: Partial<ApiPlayerCustomField>
  ): Promise<{ data: ApiPlayerCustomField }> {
    return this.put<{ data: ApiPlayerCustomField }>(
      `/player-custom-fields/${id}`,
      data
    );
  }

  async deletePlayerCustomField(id: number): Promise<void> {
    return this.delete(`/player-custom-fields/${id}`);
  }

  async bulkDeletePlayerCustomFields(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/player-custom-fields/bulk',
      { player_custom_field_ids: ids }
    );
  }

  async archivePlayerCustomField(
    id: number
  ): Promise<{ data: ApiPlayerCustomField }> {
    return this.post<{ data: ApiPlayerCustomField }>(
      `/player-custom-fields/${id}/archive`
    );
  }

  async unarchivePlayerCustomField(
    id: number
  ): Promise<{ data: ApiPlayerCustomField }> {
    return this.post<{ data: ApiPlayerCustomField }>(
      `/player-custom-fields/${id}/unarchive`
    );
  }

  async getOptions(
    fieldId: number
  ): Promise<ApiPaginatedResponse<ApiPlayerCustomFieldOption[]>> {
    return this.get(`/player-custom-fields/${fieldId}/options`);
  }

  async createOption(
    fieldId: number,
    data: Partial<ApiPlayerCustomFieldOption>
  ): Promise<{ data: ApiPlayerCustomFieldOption }> {
    return this.post<{ data: ApiPlayerCustomFieldOption }>(
      `/player-custom-fields/${fieldId}/options`,
      data
    );
  }

  async updateOption(
    fieldId: number,
    optionId: number,
    data: Partial<ApiPlayerCustomFieldOption>
  ): Promise<{ data: ApiPlayerCustomFieldOption }> {
    return this.put<{ data: ApiPlayerCustomFieldOption }>(
      `/player-custom-fields/${fieldId}/options/${optionId}`,
      data
    );
  }

  async deleteOption(fieldId: number, optionId: number): Promise<void> {
    return this.delete(
      `/player-custom-fields/${fieldId}/options/${optionId}`
    );
  }

  async getMetadata(): Promise<{ data: any }> {
    const { ApiResourceMetadataApiService } = await import(
      './resourceMetadataApi'
    );
    const metadataApi = new ApiResourceMetadataApiService();
    const response = await metadataApi.getApiResourceMetadata(
      'PlayerCustomField'
    );
    return { data: response.data };
  }
}
