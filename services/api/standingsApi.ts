import { StandingRow } from '@/types/api/event';
import { BaseApiService } from './baseApi';

export class StandingsApiService extends BaseApiService {
  async getStandings(
    eventDivisionId: number
  ): Promise<{ data: StandingRow[]; message?: string }> {
    return this.get<{ data: StandingRow[]; message?: string }>(
      `/event-divisions/${eventDivisionId}/standings`
    );
  }

  async recalculate(
    eventDivisionId: number
  ): Promise<{ data: StandingRow[]; message?: string }> {
    return this.post<{ data: StandingRow[]; message?: string }>(
      `/event-divisions/${eventDivisionId}/standings/recalculate`
    );
  }

  async updateStanding(
    standingId: number,
    payload: { points_total: number; wins: number; rank: number }
  ): Promise<{ data: StandingRow; message?: string }> {
    return this.put<{ data: StandingRow; message?: string }>(
      `/event-division-standings/${standingId}`,
      payload
    );
  }

  async patchStanding(
    standingId: number,
    payload: Partial<{ points_total: number; wins: number; rank: number }>
  ): Promise<{ data: StandingRow; message?: string }> {
    return this.patch<{ data: StandingRow; message?: string }>(
      `/event-division-standings/${standingId}`,
      payload
    );
  }
}

export const standingsApi = new StandingsApiService();
