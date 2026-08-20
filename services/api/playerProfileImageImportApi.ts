import {
  ApiPlayerProfileImageImport,
  ApiPlayerProfileImageImportPreviewRow,
} from '@/types/api/entities';
import {
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { PickedImageFile } from '@/components/players/ImageFilesPicker';
import { BaseApiService } from './baseApi';

export type PlayerProfileImageImportSaveRow = {
  index: number;
  filename: string;
  player_id: number;
  is_pdf_primary: boolean;
};

export class PlayerProfileImageImportApiService extends BaseApiService {
  async preview(payload: {
    filenames: string[];
  }): Promise<
    ApiResponse<{
      max_images_per_player: number;
      rows: ApiPlayerProfileImageImportPreviewRow[];
    }>
  > {
    return this.post('/players/profile-images/import/preview', payload);
  }

  async save(payload: {
    original_filename: string;
    rows: PlayerProfileImageImportSaveRow[];
    filesByIndex: Record<number, PickedImageFile>;
  }): Promise<ApiResponse<ApiPlayerProfileImageImport>> {
    const form = new FormData();
    form.append('original_filename', payload.original_filename);
    form.append('rows', JSON.stringify(payload.rows));
    for (const [index, picked] of Object.entries(payload.filesByIndex)) {
      if (picked.file) {
        form.append(`files[${index}]`, picked.file);
        continue;
      }
      form.append(`files[${index}]`, {
        uri: picked.uri,
        name: picked.name,
        type: picked.mimeType,
      } as unknown as Blob);
    }
    return this.uploadFormData('/players/profile-images/import', form);
  }

  async getImports(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: Record<string, string | number>;
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerProfileImageImport[]>> {
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
    return this.get(`/player-profile-image-imports${qs ? `?${qs}` : ''}`);
  }

  async getImport(
    id: number
  ): Promise<ApiResponse<ApiPlayerProfileImageImport>> {
    return this.get(`/player-profile-image-imports/${id}`);
  }
}
