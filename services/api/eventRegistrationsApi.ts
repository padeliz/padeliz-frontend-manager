import {
  ApiEventRegistration,
  ApiRegistrationCancelReason,
  ApiRegistrationDeclineReason,
} from '@/types/api/entities';
import { BaseApiService } from './baseApi';

/** Locked backend enum — keep in sync with RegistrationCancelReason. */
export const REGISTRATION_CANCEL_REASONS: {
  value: ApiRegistrationCancelReason;
  label: string;
}[] = [
  { value: 'change_of_plans', label: 'Change of plans' },
  { value: 'schedule_conflict', label: 'Schedule conflict' },
  { value: 'injury_or_illness', label: 'Injury or illness' },
  { value: 'travel_issue', label: 'Travel issue' },
  { value: 'personal_reasons', label: 'Personal reasons' },
  { value: 'other', label: 'Other' },
];

/** Locked backend enum — keep in sync with RegistrationDeclineReason. */
export const REGISTRATION_DECLINE_REASONS: {
  value: ApiRegistrationDeclineReason;
  label: string;
}[] = [
  { value: 'payment_not_completed', label: 'Payment not completed' },
  { value: 'invalid_payment', label: 'Invalid payment' },
  { value: 'ineligible', label: 'Ineligible' },
  { value: 'skill_mismatch', label: 'Skill mismatch' },
  { value: 'false_information', label: 'False information' },
  { value: 'misconduct', label: 'Misconduct' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
];

export type RegistrationOpsQueue =
  | 'awaiting_proof'
  | 'refund_pending'
  | 'abandoned_netopia';

export interface RegistrationQueueCounts {
  awaiting_proof: number;
  refund_pending: number;
  abandoned_netopia: number;
}

export class EventRegistrationsApiService extends BaseApiService {
  async getRegistrations(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      /** Top-level ops queue — not a filters[] key. */
      queue?: RegistrationOpsQueue;
      filters?: {
        player_user_id?: number;
        event_id?: number;
        event_division_id?: number | null;
        lifecycle_status?: string;
        payment_status?: string;
      };
      sort_by?: {
        player_user_id?: 'asc' | 'desc';
        event_id?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<{ data: ApiEventRegistration[]; meta: any }> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.queue) queryParams.append('queue', params.queue);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(`filters[${key}]`, value.toString());
        }
      });
    }
    if (params.sort_by) {
      Object.entries(params.sort_by).forEach(([key, value]) => {
        if (value) {
          queryParams.append(`sort_by[${key}]`, value);
        }
      });
    }

    const endpoint = `/event-registrations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<{ data: ApiEventRegistration[]; meta: any }>(endpoint);
  }

  async getRegistrationQueueCounts(): Promise<{
    data: RegistrationQueueCounts;
  }> {
    return this.get<{ data: RegistrationQueueCounts }>(
      '/registration-queue-counts'
    );
  }

  async getRegistration(
    id: number
  ): Promise<{ data: ApiEventRegistration }> {
    return this.get<{ data: ApiEventRegistration }>(
      `/event-registrations/${id}`
    );
  }

  async createRegistration(
    data: Partial<ApiEventRegistration>
  ): Promise<{ data: ApiEventRegistration }> {
    return this.post<{ data: ApiEventRegistration }>(
      `/event-registrations`,
      data
    );
  }

  async updateRegistration(
    id: number,
    data: Partial<ApiEventRegistration>
  ): Promise<{ data: ApiEventRegistration }> {
    return this.put<{ data: ApiEventRegistration }>(
      `/event-registrations/${id}`,
      data
    );
  }

  /**
   * Registrations are never hard-deleted — the backend answers 405 on DELETE.
   * Use `cancelRegistration` / `declineRegistration` instead.
   */
  async cancelRegistration(
    id: number,
    cancelReason: ApiRegistrationCancelReason
  ): Promise<{ data: ApiEventRegistration }> {
    return this.post<{ data: ApiEventRegistration }>(
      `/event-registrations/${id}/cancel`,
      { cancel_reason: cancelReason }
    );
  }

  async declineRegistration(
    id: number,
    declineReason: ApiRegistrationDeclineReason
  ): Promise<{ data: ApiEventRegistration }> {
    return this.post<{ data: ApiEventRegistration }>(
      `/event-registrations/${id}/decline`,
      { decline_reason: declineReason }
    );
  }

  async markRegistrationRefunded(
    id: number
  ): Promise<{ data: ApiEventRegistration }> {
    return this.post<{ data: ApiEventRegistration }>(
      `/event-registrations/${id}/mark-refunded`
    );
  }

  async applyManualAdjustment(
    id: number,
    data: { amount_ron: number; reason: string }
  ): Promise<{ data: ApiEventRegistration }> {
    return this.post<{ data: ApiEventRegistration }>(
      `/event-registrations/${id}/manual-adjustment`,
      data
    );
  }
}
