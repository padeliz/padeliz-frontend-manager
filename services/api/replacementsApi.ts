import { ReplacementRow } from '@/types/api/event';
import { BaseApiService } from './baseApi';

export type CreateReplacementPayload = {
  original_participation_id: number;
  substitute_participation_id?: number;
  substitute_player_id?: number;
  match_id?: number | null;
};

export type PatchReplacementPayload = {
  original_participation_id?: number;
  substitute_participation_id?: number | null;
  substitute_player_id?: number | null;
  match_id?: number | null;
};

export class ReplacementsApiService extends BaseApiService {
  async list(
    eventDivisionId: number
  ): Promise<{ data: ReplacementRow[]; message?: string }> {
    return this.get<{ data: ReplacementRow[]; message?: string }>(
      `/event-divisions/${eventDivisionId}/replacements`
    );
  }

  async listForEvent(
    eventId: number
  ): Promise<{ data: ReplacementRow[]; message?: string }> {
    return this.get<{ data: ReplacementRow[]; message?: string }>(
      `/events/${eventId}/replacements`
    );
  }

  async create(
    eventDivisionId: number,
    payload: CreateReplacementPayload
  ): Promise<{ data: ReplacementRow; message?: string }> {
    return this.post<{ data: ReplacementRow; message?: string }>(
      `/event-divisions/${eventDivisionId}/replacements`,
      payload
    );
  }

  async destroy(
    replacementId: number
  ): Promise<{ data?: any; message?: string }> {
    return this.delete<{ data?: any; message?: string }>(
      `/event-division-replacements/${replacementId}`
    );
  }

  async patch(
    replacementId: number,
    payload: PatchReplacementPayload
  ): Promise<{ data: ReplacementRow; message?: string }> {
    return super.patch<{ data: ReplacementRow; message?: string }>(
      `/event-division-replacements/${replacementId}`,
      payload
    );
  }
}

export const replacementsApi = new ReplacementsApiService();
