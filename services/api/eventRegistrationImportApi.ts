import {
  ApiEventRegistrationImportPreviewRow,
  ApiEventRegistrationImportResult,
} from '@/types/api/entities';
import { ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export type EventRegistrationImportSaveRow = {
  index: number;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  player_user_id: number | null;
  status: string | null;
};

export class EventRegistrationImportApiService extends BaseApiService {
  async preview(
    eventId: number,
    file: File
  ): Promise<
    ApiResponse<{
      format: string;
      rows: ApiEventRegistrationImportPreviewRow[];
    }>
  > {
    const form = new FormData();
    form.append('file', file);
    return this.uploadFormData(
      `/events/${eventId}/registrations/import/preview`,
      form
    );
  }

  async save(
    eventId: number,
    payload: {
      format: string;
      rows: EventRegistrationImportSaveRow[];
    }
  ): Promise<ApiResponse<ApiEventRegistrationImportResult>> {
    return this.post(`/events/${eventId}/registrations/import`, payload);
  }
}
