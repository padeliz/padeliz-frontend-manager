import { BaseApiService } from './baseApi';

export type CachedPdfPairImageResponse = {
  success: boolean;
  data: { couple_image_url: string | null };
};

export class CachedPdfImagesApiService extends BaseApiService {
  /**
   * Generate or refresh the cached MATCHES couple composite for two players.
   */
  async generatePairImage(params: {
    player1Id: number;
    player2Id: number;
    player1IsCollectingPoints: boolean;
    player2IsCollectingPoints: boolean;
  }): Promise<CachedPdfPairImageResponse> {
    return this.post<CachedPdfPairImageResponse>('/cached-pdf-pair-images', {
      player_1_id: params.player1Id,
      player_2_id: params.player2Id,
      player_1_is_collecting_points: params.player1IsCollectingPoints,
      player_2_is_collecting_points: params.player2IsCollectingPoints,
    });
  }
}

export const cachedPdfImagesApi = new CachedPdfImagesApiService();
