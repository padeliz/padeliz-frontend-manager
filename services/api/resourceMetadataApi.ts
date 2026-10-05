import { ApiResourceMetadata } from '@/types/api/metadata';
import { ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class ApiResourceMetadataApiService extends BaseApiService {
  /**
   * Get resource metadata for a specific schema/model
   * @param schema - Schema/Model name (e.g., "ApiPlayer", "Club", "ApiEvent")
   */
  async getApiResourceMetadata(
    schema: string
  ): Promise<ApiResponse<ApiResourceMetadata>> {
    return this.get<ApiResponse<ApiResourceMetadata>>(`/metadata/${schema}`);
  }
}
