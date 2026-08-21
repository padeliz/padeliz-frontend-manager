import {
  ApiEditionRegistrationImportPreviewRow,
  ApiEditionRegistrationImportResult,
} from '@/types/api/entities';
import { ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export type EditionRegistrationImportSaveRow = {
  index: number;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  player_id: number | null;
  status: string | null;
};

export class EditionRegistrationImportApiService extends BaseApiService {
  async preview(
    editionId: number,
    file: File
  ): Promise<
    ApiResponse<{
      format: string;
      rows: ApiEditionRegistrationImportPreviewRow[];
    }>
  > {
    const form = new FormData();
    form.append('file', file);
    return this.uploadFormData(
      `/editions/${editionId}/registrations/import/preview`,
      form
    );
  }

  async save(
    editionId: number,
    payload: {
      format: string;
      rows: EditionRegistrationImportSaveRow[];
    }
  ): Promise<ApiResponse<ApiEditionRegistrationImportResult>> {
    return this.post(`/editions/${editionId}/registrations/import`, payload);
  }
}
