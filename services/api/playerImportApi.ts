import {
  ApiPlayerImport,
  ApiPlayerImportPreviewRow,
} from '@/types/api/entities';
import {
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export type PlayerImportSaveRow = {
  index: number;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  player_id: number | null;
};

export class PlayerImportApiService extends BaseApiService {
  async preview(file: File): Promise<
    ApiResponse<{ format: string; rows: ApiPlayerImportPreviewRow[] }>
  > {
    const form = new FormData();
    form.append('file', file);
    return this.uploadFormData('/players/import/preview', form);
  }

  async save(payload: {
    format: string;
    filename: string;
    rows: PlayerImportSaveRow[];
  }): Promise<ApiResponse<ApiPlayerImport>> {
    return this.post('/players/import', payload);
  }

  async getImports(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number>;
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerImport[]>> {
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
    return this.get(`/player-imports${qs ? `?${qs}` : ''}`);
  }

  async getImport(id: number): Promise<ApiResponse<ApiPlayerImport>> {
    return this.get(`/player-imports/${id}`);
  }

  async getImportRows(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number>;
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerImport['rows']>> {
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
    return this.get(`/player-import-rows${qs ? `?${qs}` : ''}`);
  }
}
