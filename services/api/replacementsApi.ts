import { ReplacementRow } from '@/types/api/edition';
import { BaseApiService } from './baseApi';

export type CreateReplacementPayload = {
  original_participation_id: number;
  substitute_participation_id?: number;
  substitute_player_id?: number;
  match_id?: number | null;
};

export class ReplacementsApiService extends BaseApiService {
  async list(
    editionDivisionId: number
  ): Promise<{ data: ReplacementRow[]; message?: string }> {
    return this.get<{ data: ReplacementRow[]; message?: string }>(
      `/edition-divisions/${editionDivisionId}/replacements`
    );
  }

  async listForEdition(
    editionId: number
  ): Promise<{ data: ReplacementRow[]; message?: string }> {
    return this.get<{ data: ReplacementRow[]; message?: string }>(
      `/editions/${editionId}/replacements`
    );
  }

  async create(
    editionDivisionId: number,
    payload: CreateReplacementPayload
  ): Promise<{ data: ReplacementRow; message?: string }> {
    return this.post<{ data: ReplacementRow; message?: string }>(
      `/edition-divisions/${editionDivisionId}/replacements`,
      payload
    );
  }

  async destroy(
    replacementId: number
  ): Promise<{ data?: any; message?: string }> {
    return this.delete<{ data?: any; message?: string }>(
      `/edition-division-replacements/${replacementId}`
    );
  }
}

export const replacementsApi = new ReplacementsApiService();
