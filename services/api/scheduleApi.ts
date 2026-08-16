import {
  ScheduleFormPayload,
  SchedulePreview,
  ScheduleState,
} from '@/types/api/edition';
import { BaseApiService } from './baseApi';

export class ScheduleApiService extends BaseApiService {
  private base(editionDivisionId: number) {
    return `/edition-divisions/${editionDivisionId}/schedule`;
  }

  async getSchedule(
    editionDivisionId: number,
    options?: { board?: boolean; scores?: boolean }
  ): Promise<{ data: ScheduleState; message?: string }> {
    const params = new URLSearchParams();
    if (options?.board) params.set('board', '1');
    if (options?.scores) params.set('scores', '1');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.get<{ data: ScheduleState; message?: string }>(
      `${this.base(editionDivisionId)}${qs}`
    );
  }

  async updateForm(
    editionDivisionId: number,
    payload: ScheduleFormPayload
  ): Promise<{ data: any; message?: string }> {
    return this.put<{ data: any; message?: string }>(
      `${this.base(editionDivisionId)}/form`,
      payload
    );
  }

  async patchForm(
    editionDivisionId: number,
    payload: ScheduleFormPayload
  ): Promise<{ data: any; message?: string }> {
    return this.patch<{ data: any; message?: string }>(
      `${this.base(editionDivisionId)}/form`,
      payload
    );
  }

  async preview(
    editionDivisionId: number,
    payload: Partial<ScheduleFormPayload> = {}
  ): Promise<{ data: SchedulePreview; message?: string }> {
    return this.post<{ data: SchedulePreview; message?: string }>(
      `${this.base(editionDivisionId)}/preview`,
      payload
    );
  }

  async generate(
    editionDivisionId: number,
    payload: ScheduleFormPayload = {}
  ): Promise<{ data: any; message?: string }> {
    return this.post<{ data: any; message?: string }>(
      `${this.base(editionDivisionId)}/generate`,
      payload
    );
  }

  async destroySchedule(
    editionDivisionId: number
  ): Promise<{ data: any; message?: string }> {
    return this.delete<{ data: any; message?: string }>(
      this.base(editionDivisionId)
    );
  }

  async reorderMatches(
    editionDivisionId: number,
    payload: { court: number; match_ids: number[] }
  ): Promise<{ data: any; message?: string }> {
    return this.post<{ data: any; message?: string }>(
      `${this.base(editionDivisionId)}/matches/reorder`,
      payload
    );
  }
}

export const scheduleApi = new ScheduleApiService();
