import { ApiEventParticipationSummary } from '@/types/api/entities';
import { ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export type EventParticipationMapPreview = {
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
  event_wide_registration_count: number;
};

export type EventParticipationMapResult = {
  created_count: number;
  by_event_division: Array<{
    event_division_id: number;
    count: number;
  }>;
};

export class EventParticipationMappingApiService extends BaseApiService {
  async preview(
    eventId: number
  ): Promise<ApiResponse<EventParticipationMapPreview>> {
    return this.get<ApiResponse<EventParticipationMapPreview>>(
      `/events/${eventId}/participations/map/preview`
    );
  }

  async map(
    eventId: number,
    options: { confirm_overwrite?: boolean } = {}
  ): Promise<ApiResponse<EventParticipationMapResult>> {
    return this.post<ApiResponse<EventParticipationMapResult>>(
      `/events/${eventId}/participations/map`,
      {
        confirm_overwrite: !!options.confirm_overwrite,
      }
    );
  }
}

export type { ApiEventParticipationSummary };
