import { ApiEventRegistrationCheckout } from '@/types/api/entities';
import { RegistrationOpsQueue } from './eventRegistrationsApi';
import { BaseApiService } from './baseApi';

/**
 * Manager payment-ops queues — one row per checkout (`queue=` triage).
 */
export class RegistrationCheckoutsApiService extends BaseApiService {
  async getCheckouts(params: {
    queue: RegistrationOpsQueue;
    page?: number;
    per_page?: number;
    q?: string;
  }): Promise<{ data: ApiEventRegistrationCheckout[]; meta: any }> {
    const queryParams = new URLSearchParams();
    queryParams.append('queue', params.queue);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);

    const endpoint = `/registration-checkouts?${queryParams.toString()}`;
    return this.listCheckouts(endpoint, params.per_page);
  }

  /**
   * Every checkout of one player (Player > Checkouts tab): no `queue` triage —
   * the API skips it whenever `filters[player_user_id]` is present.
   */
  async getPlayerCheckouts(
    playerId: number
  ): Promise<{ data: ApiEventRegistrationCheckout[]; meta: any }> {
    const queryParams = new URLSearchParams();
    queryParams.append('filters[player_user_id]', String(playerId));

    return this.listCheckouts(`/registration-checkouts?${queryParams.toString()}`);
  }

  private async listCheckouts(
    endpoint: string,
    perPage?: number
  ): Promise<{ data: ApiEventRegistrationCheckout[]; meta: any }> {
    const response = await this.get<{
      data: ApiEventRegistrationCheckout[];
      meta?: any;
    }>(endpoint);

    const data = response.data ?? [];
    return {
      data,
      meta: response.meta ?? {
        total: data.length,
        last_page: 1,
        current_page: 1,
        per_page: data.length || perPage || 10,
      },
    };
  }
}
