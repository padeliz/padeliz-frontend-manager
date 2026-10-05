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
        per_page: data.length || params.per_page || 10,
      },
    };
  }
}
