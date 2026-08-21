/**
 * Organizers API Service
 * Organizers own the logo used to brand edition posters.
 */

import { ApiOrganizer } from '@/types/api/entities';
import {
  ApiBulkDeleteResponse,
  ApiPaginatedResponse,
  ApiResponse,
} from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class OrganizersApiService extends BaseApiService {
  async getOrganizers(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      filters?: {
        show_edition_label?: boolean | number;
      };
      sort_by?: {
        id_organizer?: 'asc' | 'desc';
        name?: 'asc' | 'desc';
        show_edition_label?: 'asc' | 'desc';
        inserted_at?: 'asc' | 'desc';
        updated_at?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<ApiPaginatedResponse<ApiOrganizer[]>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(`filters[${key}]`, String(value));
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

    const endpoint = `/organizers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiOrganizer[]>>(endpoint);
  }

  async getOrganizer(id: number): Promise<ApiResponse<ApiOrganizer>> {
    return this.get<ApiResponse<ApiOrganizer>>(`/organizers/${id}`);
  }

  async createOrganizer(
    data: Partial<ApiOrganizer>
  ): Promise<ApiResponse<ApiOrganizer>> {
    return this.post<ApiResponse<ApiOrganizer>>('/organizers', data);
  }

  async updateOrganizer(
    id: number,
    data: Partial<ApiOrganizer>
  ): Promise<ApiResponse<ApiOrganizer>> {
    return this.put<ApiResponse<ApiOrganizer>>(`/organizers/${id}`, data);
  }

  async deleteOrganizer(id: number): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`/organizers/${id}`);
  }

  async bulkDeleteOrganizers(
    ids: number[]
  ): Promise<ApiResponse<ApiBulkDeleteResponse>> {
    return this.bulkDelete<ApiResponse<ApiBulkDeleteResponse>>(
      '/organizers/bulk',
      { organizer_ids: ids }
    );
  }
}

export const organizersApi = new OrganizersApiService();
