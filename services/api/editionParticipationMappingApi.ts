import { ApiEditionParticipationSummary } from '@/types/api/entities';
import { ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export type EditionParticipationMapPreview = {
  can_map: boolean;
  disabled_reason:
    | 'finalized'
    | 'schedule_exists'
    | 'lottery_exists'
    | 'no_divisions'
    | null;
  existing_participations_count: number;
  registered_player_count: number;
  division_specific_registration_count: number;
  edition_wide_registration_count: number;
};

export type EditionParticipationMapResult = {
  created_count: number;
  by_edition_division: Array<{
    edition_division_id: number;
    count: number;
  }>;
};

export class EditionParticipationMappingApiService extends BaseApiService {
  async preview(
    editionId: number
  ): Promise<ApiResponse<EditionParticipationMapPreview>> {
    return this.get<ApiResponse<EditionParticipationMapPreview>>(
      `/editions/${editionId}/participations/map/preview`
    );
  }

  async map(
    editionId: number,
    options: { confirm_overwrite?: boolean } = {}
  ): Promise<ApiResponse<EditionParticipationMapResult>> {
    return this.post<ApiResponse<EditionParticipationMapResult>>(
      `/editions/${editionId}/participations/map`,
      {
        confirm_overwrite: !!options.confirm_overwrite,
      }
    );
  }
}

export type { ApiEditionParticipationSummary };
