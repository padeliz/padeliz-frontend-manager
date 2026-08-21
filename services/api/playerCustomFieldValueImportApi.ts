import {
  ApiPlayerCustomFieldValueImport,
  ApiPlayerCustomFieldValueImportPreviewRow,
  ApiPlayerCustomFieldValueImportRow,
} from '@/types/api/entities';
import {
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export type PlayerCustomFieldValueImportSaveRow = {
  index: number;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  player_id: number;
  answers: Record<string, string>;
};

export class PlayerCustomFieldValueImportApiService extends BaseApiService {
  async preview(file: File): Promise<
    ApiResponse<{
      format: string;
      rows: ApiPlayerCustomFieldValueImportPreviewRow[];
    }>
  > {
    const form = new FormData();
    form.append('file', file);
    return this.uploadFormData(
      '/players/custom-field-values/import/preview',
      form
    );
  }

  async save(payload: {
    format: string;
    filename: string;
    edition_id?: number | null;
    rows: PlayerCustomFieldValueImportSaveRow[];
  }): Promise<ApiResponse<ApiPlayerCustomFieldValueImport>> {
    return this.post('/players/custom-field-values/import', payload);
  }

  async getImports(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number>;
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerCustomFieldValueImport[]>> {
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
      `/player-custom-field-value-imports${qs ? `?${qs}` : ''}`
    );
  }

  async getImport(
    id: number
  ): Promise<ApiResponse<ApiPlayerCustomFieldValueImport>> {
    return this.get(`/player-custom-field-value-imports/${id}`);
  }

  async getImportRows(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number>;
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerCustomFieldValueImportRow[]>> {
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
      `/player-custom-field-value-import-rows${qs ? `?${qs}` : ''}`
    );
  }
}
