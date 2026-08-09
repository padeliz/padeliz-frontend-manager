import { ApiResourceMetadata } from '@/types/api/metadata';
import { ApiResponse } from '@/types/api/responses';
import { BaseApiService } from './baseApi';

export class ApiResourceMetadataApiService extends BaseApiService {
  /**
   * Get resource metadata for a specific schema/model
   * @param schema - Schema/Model name (e.g., "ApiPlayer", "Club", "ApiEdition")
   */
  async getApiResourceMetadata(
    schema: string
  ): Promise<ApiResponse<ApiResourceMetadata>> {
    return this.get<ApiResponse<ApiResourceMetadata>>(`/metadata/${schema}`);
  }

  /**
   * Clear resource metadata cache for a specific schema/model
   * @param schema - Schema/Model name (e.g., "ApiPlayer", "Club", "ApiEdition")
   */
  async clearApiResourceMetadataCache(
    schema: string
  ): Promise<ApiResponse<null>> {
    return this.delete<ApiResponse<null>>(`/metadata/${schema}/cache`);
  }

  /**
   * Clear all resource metadata cache
   */
  async clearAllMetadataCache(): Promise<ApiResponse<null>> {
    return this.delete<ApiResponse<null>>('/metadata/cache');
  }
}
