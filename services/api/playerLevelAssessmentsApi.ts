import {
  ApiPlayerLevelAssessment,
  ApiReviewStatus,
} from '@/types/api/entities';
import { ApiPaginatedResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

/**
 * Review-only: players create assessments, managers list / show / approve / reject.
 */
export class PlayerLevelAssessmentsApiService extends BaseApiService {
  async getAssessments(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_user_id?: number;
        review_status?: ApiReviewStatus;
        ready_for_review?: 0 | 1;
      };
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerLevelAssessment[]>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(`filters[${key}]`, String(value));
        }
      });
    }
    if (params.sort_by) {
      Object.entries(params.sort_by).forEach(([key, value]) => {
        if (value) queryParams.append(`sort_by[${key}]`, value);
      });
    }
    const endpoint = `/player-level-assessments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiPlayerLevelAssessment[]>>(
      endpoint
    );
  }

  async getAssessment(
    id: number
  ): Promise<{ data: ApiPlayerLevelAssessment }> {
    return this.get<{ data: ApiPlayerLevelAssessment }>(
      `/player-level-assessments/${id}`
    );
  }

  /** `level` must be exactly two decimals inside a seeded band. */
  async approveAssessment(
    id: number,
    payload: { level: string; review_message?: string | null }
  ): Promise<{ data: ApiPlayerLevelAssessment }> {
    return this.patch<{ data: ApiPlayerLevelAssessment }>(
      `/player-level-assessments/${id}/approve`,
      payload
    );
  }

  async rejectAssessment(
    id: number,
    payload: { review_message?: string | null } = {}
  ): Promise<{ data: ApiPlayerLevelAssessment }> {
    return this.patch<{ data: ApiPlayerLevelAssessment }>(
      `/player-level-assessments/${id}/reject`,
      payload
    );
  }
}
