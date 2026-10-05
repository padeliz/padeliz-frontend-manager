import { GameMatch } from '@/types/api/event';
import { BaseApiService } from './baseApi';

export type MatchScorePayload =
  | {
      left_score?: number;
      right_score?: number;
      sides?: never;
    }
  | {
      sides: Array<{ side: 'LEFT' | 'RIGHT'; score: number }>;
      left_score?: never;
      right_score?: never;
    };

export class MatchesApiService extends BaseApiService {
  async updateScores(
    matchId: number,
    payload: MatchScorePayload
  ): Promise<{ data: GameMatch; message?: string }> {
    return this.patch<{ data: GameMatch; message?: string }>(
      `/matches/${matchId}/scores`,
      payload
    );
  }
}

export const matchesApi = new MatchesApiService();
