import { ApiLevel } from '@/types/api/entities';
import { ApiPaginatedResponse } from '@/types/api/responses';
import { fetchAllPaginated } from '@/utils/fetchAllPaginated';
import { BaseApiService } from './baseApi';

/**
 * Seeded player level bands. Read-only: there is no create/update/delete.
 */
export class LevelsApiService extends BaseApiService {
  async getLevels(
    params: {
      page?: number;
      per_page?: number;
      q?: string;
      sort_by?: {
        id_level?: 'asc' | 'desc';
        name?: 'asc' | 'desc';
        level_min?: 'asc' | 'desc';
        level_max?: 'asc' | 'desc';
      };
    } = {}
  ): Promise<ApiPaginatedResponse<ApiLevel[]>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page)
      queryParams.append('per_page', params.per_page.toString());
    if (params.q) queryParams.append('q', params.q);
    if (params.sort_by) {
      Object.entries(params.sort_by).forEach(([key, value]) => {
        if (value) queryParams.append(`sort_by[${key}]`, value);
      });
    }
    const endpoint = `/levels${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.get<ApiPaginatedResponse<ApiLevel[]>>(endpoint);
  }

  async getLevel(id: number): Promise<{ data: ApiLevel }> {
    return this.get<{ data: ApiLevel }>(`/levels/${id}`);
  }

  /** Every band (they are few and seeded) for pickers and validation. */
  async getAllLevels(): Promise<ApiLevel[]> {
    const { data } = await fetchAllPaginated<ApiLevel>(page =>
      this.getLevels({ page, per_page: 100 })
    );
    return data;
  }
}
