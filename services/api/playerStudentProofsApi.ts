import { ApiPlayerStudentProof, ApiReviewStatus } from '@/types/api/entities';
import { ApiPaginatedResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

/**
 * Review-only: players upload proofs, managers list / show / approve / reject.
 */
export class PlayerStudentProofsApiService extends BaseApiService {
  async getProofs(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_id?: number;
        review_status?: ApiReviewStatus;
        ready_for_review?: 0 | 1;
      };
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerStudentProof[]>> {
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
    const endpoint = `/player-student-proofs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiPlayerStudentProof[]>>(endpoint);
  }

  async getProof(id: number): Promise<{ data: ApiPlayerStudentProof }> {
    return this.get<{ data: ApiPlayerStudentProof }>(
      `/player-student-proofs/${id}`
    );
  }

  async approveProof(
    id: number,
    payload: {
      review_message?: string | null;
      /** Optional correction of the validity date (YYYY-MM-DD). */
      student_until?: string | null;
    } = {}
  ): Promise<{ data: ApiPlayerStudentProof }> {
    return this.patch<{ data: ApiPlayerStudentProof }>(
      `/player-student-proofs/${id}/approve`,
      payload
    );
  }

  async rejectProof(
    id: number,
    payload: { review_message?: string | null } = {}
  ): Promise<{ data: ApiPlayerStudentProof }> {
    return this.patch<{ data: ApiPlayerStudentProof }>(
      `/player-student-proofs/${id}/reject`,
      payload
    );
  }
}
