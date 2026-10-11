import {
  ApiUserImport,
  ApiUserImportPreviewRow,
} from '@/types/api/entities';
import {
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export type UserImportSaveRow = {
  index: number;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  player_user_id: number | null;
};

export class UserImportApiService extends BaseApiService {
  async preview(file: File): Promise<
    ApiResponse<{ format: string; rows: ApiUserImportPreviewRow[] }>
  > {
    const form = new FormData();
    form.append('file', file);
    return this.uploadFormData('/players/import/preview', form);
  }

  async save(payload: {
    format: string;
    filename: string;
    rows: UserImportSaveRow[];
  }): Promise<ApiResponse<ApiUserImport>> {
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
  ): Promise<ApiPaginatedResponse<ApiUserImport[]>> {
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
    return this.get(`/user-imports${qs ? `?${qs}` : ''}`);
  }

  async getImport(id: number): Promise<ApiResponse<ApiUserImport>> {
    return this.get(`/user-imports/${id}`);
  }

  async getImportRows(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number>;
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiUserImport['rows']>> {
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
    return this.get(`/user-import-rows${qs ? `?${qs}` : ''}`);
  }
}
