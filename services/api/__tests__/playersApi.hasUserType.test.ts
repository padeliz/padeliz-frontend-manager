import { PlayersApiService } from '@/services/api/playersApi';

describe('PlayersApiService.getPlayers has_user_type', () => {
  it('appends filters[has_user_type] when provided', async () => {
    const svc = new PlayersApiService();
    const get = jest.spyOn(svc as any, 'get').mockResolvedValue({ data: [] });

    await svc.getPlayers({
      page: 1,
      per_page: 50,
      filters: { has_user_type: 'manager' },
    });

    expect(get).toHaveBeenCalledWith(
      expect.stringContaining('filters%5Bhas_user_type%5D=manager')
    );

    get.mockRestore();
  });

  it('omits has_user_type when not provided', async () => {
    const svc = new PlayersApiService();
    const get = jest.spyOn(svc as any, 'get').mockResolvedValue({ data: [] });

    await svc.getPlayers({ page: 1, per_page: 50 });

    expect(get).toHaveBeenCalledWith(
      expect.not.stringContaining('has_user_type')
    );

    get.mockRestore();
  });
});
