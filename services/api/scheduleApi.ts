import {
  ScheduleFormPayload,
  SchedulePreview,
  ScheduleState,
} from '@/types/api/event';
import { BaseApiService } from './baseApi';

export class ScheduleApiService extends BaseApiService {
  private base(eventDivisionId: number) {
    return `/event-divisions/${eventDivisionId}/schedule`;
  }

  async getSchedule(
    eventDivisionId: number,
    options?: { board?: boolean; scores?: boolean }
  ): Promise<{ data: ScheduleState; message?: string }> {
    const params = new URLSearchParams();
    if (options?.board) params.set('board', '1');
    if (options?.scores) params.set('scores', '1');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.get<{ data: ScheduleState; message?: string }>(
      `${this.base(eventDivisionId)}${qs}`
    );
  }

  async updateForm(
    eventDivisionId: number,
    payload: ScheduleFormPayload
  ): Promise<{ data: any; message?: string }> {
    return this.put<{ data: any; message?: string }>(
      `${this.base(eventDivisionId)}/form`,
      payload
    );
  }

  async patchForm(
    eventDivisionId: number,
    payload: ScheduleFormPayload
  ): Promise<{ data: any; message?: string }> {
    return this.patch<{ data: any; message?: string }>(
      `${this.base(eventDivisionId)}/form`,
      payload
    );
  }

  async preview(
    eventDivisionId: number,
    payload: Partial<ScheduleFormPayload> = {}
  ): Promise<{ data: SchedulePreview; message?: string }> {
    return this.post<{ data: SchedulePreview; message?: string }>(
      `${this.base(eventDivisionId)}/preview`,
      payload
    );
  }

  async generate(
    eventDivisionId: number,
    payload: ScheduleFormPayload = {}
  ): Promise<{ data: any; message?: string }> {
    return this.post<{ data: any; message?: string }>(
      `${this.base(eventDivisionId)}/generate`,
      payload
    );
  }

  async destroySchedule(
    eventDivisionId: number
  ): Promise<{ data: any; message?: string }> {
    return this.delete<{ data: any; message?: string }>(
      this.base(eventDivisionId)
    );
  }

  async reorderMatches(
    eventDivisionId: number,
    payload: { court: number; match_ids: number[] }
  ): Promise<{ data: any; message?: string }> {
    return this.post<{ data: any; message?: string }>(
      `${this.base(eventDivisionId)}/matches/reorder`,
      payload
    );
  }
}

export const scheduleApi = new ScheduleApiService();
