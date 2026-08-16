import { ApiPlayer } from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class PlayersApiService extends BaseApiService {
  /**
   * Get paginated list of players
   */
  async getPlayers(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        name?: string;
        first_name?: string;
        last_name?: string;
        skill_division?: number;
        being_student?: boolean;
        year_of_birth?: number;
        playtomic_id?: string;
        rankedin_id?: string;
        instagram_username?: string;
        facebook_username?: string;
      };
      sort_by?: {
        name?: 'asc' | 'desc';
        first_name?: 'asc' | 'desc';
        last_name?: 'asc' | 'desc';
        skill_division?: 'asc' | 'desc';
        year_of_birth?: 'asc' | 'desc';
        being_student?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayer[]>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);

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

    const endpoint = `/players${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiPlayer[]>>(endpoint);
  }

  /**
   * Get a specific player by ID
   */
  async getPlayer(id: number): Promise<{ data: ApiPlayer }> {
    return this.get<{ data: ApiPlayer }>(`/players/${id}`);
  }

  /**
   * Create a new player
   */
  async createPlayer(
    playerData: Partial<ApiPlayer>
  ): Promise<{ data: ApiPlayer }> {
    return this.post<{ data: ApiPlayer }>('/players', playerData);
  }

  /**
   * Update an existing player
   */
  async updatePlayer(
    id: number,
    playerData: Partial<ApiPlayer>
  ): Promise<{ data: ApiPlayer }> {
    return this.put<{ data: ApiPlayer }>(`/players/${id}`, playerData);
  }

  /**
   * Delete a player
   */
  async deletePlayer(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/players/${id}`);
  }

  /**
   * Bulk delete players
   */
  async bulkDeletePlayers(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/players/bulk',
      {
        player_ids: ids,
      }
    );
  }

  /**
   * Generate or refresh cached PDF circular avatar for a player.
   */
  async generatePdfAvatar(
    playerId: number,
    isCollectingPoints: boolean
  ): Promise<{ success: boolean; data: { pdf_avatar_url: string | null } }> {
    return this.post(`/players/${playerId}/pdf-avatar`, {
      is_collecting_points: isCollectingPoints,
    });
  }

  /**
   * Get players metadata
   */
  async getMetadata(): Promise<{ data: any }> {
    const { ApiResourceMetadataApiService } = await import(
      './resourceMetadataApi'
    );
    const metadataApi = new ApiResourceMetadataApiService();
    const response = await metadataApi.getApiResourceMetadata('Player');
    return { data: response.data };
  }
}
