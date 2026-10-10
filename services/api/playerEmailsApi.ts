import { ApiPlayerEmail } from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class PlayerEmailsApiService extends BaseApiService {
  async getEmails(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        player_id?: number;
        is_primary?: 0 | 1;
      };
      sort_by?: Record<string, 'asc' | 'desc'>;
    } = {}
  ): Promise<ApiPaginatedResponse<ApiPlayerEmail[]>> {
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
    const endpoint = `/player-emails${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiPlayerEmail[]>>(endpoint);
  }

  async getEmail(id: number): Promise<{ data: ApiPlayerEmail }> {
    return this.get<{ data: ApiPlayerEmail }>(`/player-emails/${id}`);
  }

  async createEmail(
    data: Partial<ApiPlayerEmail>
  ): Promise<{ data: ApiPlayerEmail }> {
    return this.post<{ data: ApiPlayerEmail }>('/player-emails', data);
  }

  async updateEmail(
    id: number,
    data: Partial<ApiPlayerEmail>
  ): Promise<{ data: ApiPlayerEmail }> {
    return this.put<{ data: ApiPlayerEmail }>(`/player-emails/${id}`, data);
  }

  async deleteEmail(id: number): Promise<void> {
    return this.delete(`/player-emails/${id}`);
  }

  async bulkDeleteEmails(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/player-emails/bulk',
      { player_email_ids: ids }
    );
  }
}
