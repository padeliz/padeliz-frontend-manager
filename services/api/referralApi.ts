import {
  ApiEventReferralSetting,
  ApiPricingPreviewQuote,
  ApiReferralAttribution,
  ApiReferralTouchpoint,
} from '@/types/api/entities';
import { BaseApiService } from './baseApi';

export class ReferralApiService extends BaseApiService {
  async getEventReferralSettings(
    eventId: number
  ): Promise<{ data: ApiEventReferralSetting }> {
    return this.get<{ data: ApiEventReferralSetting }>(
      `/events/${eventId}/referral-settings`
    );
  }

  async updateEventReferralSettings(
    eventId: number,
    data: { code_ttl_hours: number }
  ): Promise<{ data: ApiEventReferralSetting }> {
    return this.put<{ data: ApiEventReferralSetting }>(
      `/events/${eventId}/referral-settings`,
      data
    );
  }

  async getReferralTouchpoints(
    params: {
      page?: number;
      per_page?: number;
      event_id?: number;
      referrer?: number;
      referred?: number;
      discount_eligible?: boolean;
    } = {}
  ): Promise<{ data: ApiReferralTouchpoint[]; meta: any }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.event_id != null)
      queryParams.append('event_id', params.event_id.toString());
    if (params.referrer != null)
      queryParams.append('referrer', params.referrer.toString());
    if (params.referred != null)
      queryParams.append('referred', params.referred.toString());
    if (params.discount_eligible != null)
      queryParams.append(
        'discount_eligible',
        params.discount_eligible ? '1' : '0'
      );

    const endpoint = `/referral-analytics/touchpoints${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    return this.get<{ data: ApiReferralTouchpoint[]; meta: any }>(endpoint);
  }

  async getReferralAttributions(
    params: {
      page?: number;
      per_page?: number;
      event_id?: number;
      referrer?: number;
      referred?: number;
      status?: string;
    } = {}
  ): Promise<{ data: ApiReferralAttribution[]; meta: any }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.event_id != null)
      queryParams.append('event_id', params.event_id.toString());
    if (params.referrer != null)
      queryParams.append('referrer', params.referrer.toString());
    if (params.referred != null)
      queryParams.append('referred', params.referred.toString());
    if (params.status) queryParams.append('status', params.status);

    const endpoint = `/referral-analytics/attributions${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;
    return this.get<{ data: ApiReferralAttribution[]; meta: any }>(endpoint);
  }

  async previewPricing(data: {
    player_user_id: number;
    event_id: number;
    event_division_id: number;
    selected_benefit_ids?: number[];
    referrer_player_user_id?: number | null;
  }): Promise<{ data: ApiPricingPreviewQuote }> {
    return this.post<{ data: ApiPricingPreviewQuote }>(
      '/pricing/preview',
      data
    );
  }
}
