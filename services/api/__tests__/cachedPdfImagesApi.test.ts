import { CachedPdfImagesApiService } from '@/services/api/cachedPdfImagesApi';

describe('CachedPdfImagesApiService.generatePairImage', () => {
  it('posts snake_case pair payload to /cached-pdf-pair-images', async () => {
    const service = new CachedPdfImagesApiService();
    const post = jest.fn(async () => ({
      success: true,
      data: { couple_image_url: 'https://cdn.example/couple.png' },
    }));
    (service as any).post = post;

    const res = await service.generatePairImage({
      player1Id: 11,
      player2Id: 22,
      player1IsCollectingPoints: true,
      player2IsCollectingPoints: false,
    });

    expect(post).toHaveBeenCalledWith('/cached-pdf-pair-images', {
      player_1_id: 11,
      player_2_id: 22,
      player_1_is_collecting_points: true,
      player_2_is_collecting_points: false,
    });
    expect(res.data.couple_image_url).toBe('https://cdn.example/couple.png');
  });
});
