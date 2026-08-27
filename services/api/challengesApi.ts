import {
  ApiChallengeSession,
  ChallengeSessionType,
} from '@/types/api/challenge';
import { BaseApiService } from './baseApi';
import type { ChallengeBoardState } from '@/lib/challenges/types';

export type ChallengeSyncRequest = {
  id_challenge_session: number;
  type: string;
  status: string;
  title: string;
  bottom_text: string;
  started_at: number;
  completed_at: number | null;
  inserted_at: number;
  state_json: ChallengeBoardState | Record<string, unknown>;
  state_sequence: number;
};

export type ChallengeStateResponse = {
  session: ApiChallengeSession;
  state_json: Record<string, unknown>;
  state_sequence: number;
};

export class ChallengesApiService extends BaseApiService {
  async list(params?: {
    type?: ChallengeSessionType;
    status?: string;
    page?: number;
    per_page?: number;
  }) {
    const search = new URLSearchParams();
    if (params?.type) search.set('type', params.type);
    if (params?.status) search.set('status', params.status);
    if (params?.page) search.set('page', String(params.page));
    if (params?.per_page) search.set('per_page', String(params.per_page));
    const qs = search.toString();

    return this.get<{
      data: ApiChallengeSession[];
      meta: Record<string, unknown>;
      links: Record<string, unknown>;
    }>(`/challenges${qs ? `?${qs}` : ''}`);
  }

  async create(type: ChallengeSessionType) {
    return this.post<{ data: ApiChallengeSession }>('/challenges', { type });
  }

  async show(sessionId: number) {
    return this.get<{ data: ApiChallengeSession }>(`/challenges/${sessionId}`);
  }

  async getState(sessionId: number) {
    return this.get<{ data: ChallengeStateResponse }>(
      `/challenges/${sessionId}/state`
    );
  }

  async sync(sessionId: number, body: ChallengeSyncRequest) {
    return this.post<{ data: ApiChallengeSession }>(
      `/challenges/${sessionId}/sync`,
      body
    );
  }
}

export const challengesApi = new ChallengesApiService();
