import { ApiPlayerIdentity } from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

/**
 * Identities are linked by players themselves (OAuth / SMS in the App), so
 * managers can list, view, edit and delete them but never create them.
 */
export class PlayerIdentitiesApiService extends BaseApiService {
  async getIdentities(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_id?: number;
        provider?: string;
        is_avatar_primary?: 0 | 1;
      };
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerIdentity[]>> {
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
    const endpoint = `/player-identities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiPlayerIdentity[]>>(endpoint);
  }

  async getIdentity(id: number): Promise<{ data: ApiPlayerIdentity }> {
    return this.get<{ data: ApiPlayerIdentity }>(`/player-identities/${id}`);
  }

  async updateIdentity(
    id: number,
    data: Partial<ApiPlayerIdentity>
  ): Promise<{ data: ApiPlayerIdentity }> {
    return this.put<{ data: ApiPlayerIdentity }>(
      `/player-identities/${id}`,
      data
    );
  }

  async deleteIdentity(id: number): Promise<void> {
    return this.delete(`/player-identities/${id}`);
  }

  /**
   * The API has no bulk endpoint for identities: delete one by one and
   * report the outcome in the shared bulk-delete shape.
   */
  async bulkDeleteIdentities(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    const outcomes = await Promise.allSettled(
      ids.map(id => this.deleteIdentity(id))
    );

    const successful: ApiBulkDeleteResponse['successful'] = [];
    const failed: ApiBulkDeleteResponse['failed'] = [];
    outcomes.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        successful.push({ id: ids[index] });
      } else {
        failed.push({
          id: ids[index],
          reason: outcome.reason?.message ?? 'Failed to delete identity',
        });
      }
    });

    return {
      success: failed.length === 0,
      message:
        failed.length === 0
          ? 'Player identities deleted successfully'
          : 'Some player identities failed to delete',
      data: {
        successful,
        failed,
        total_requested: ids.length,
        total_successful: successful.length,
        total_failed: failed.length,
      },
    };
  }
}
