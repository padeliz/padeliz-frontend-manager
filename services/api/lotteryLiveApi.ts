import { LotteryLiveState } from '@/types/api/event';
import { BaseApiService } from './baseApi';

export class LotteryLiveApiService extends BaseApiService {
  async live(
    lotteryId: number
  ): Promise<{ data: LotteryLiveState }> {
    return this.get<{ data: LotteryLiveState }>(
      `/event-lotteries/${lotteryId}/live`
    );
  }

  async draw(lotteryId: number): Promise<{ data: LotteryLiveState }> {
    return this.post<{ data: LotteryLiveState }>(
      `/event-lotteries/${lotteryId}/draw`
    );
  }

  async announce(
    lotteryId: number,
    idLucky: number
  ): Promise<{ data: LotteryLiveState }> {
    return this.post<{ data: LotteryLiveState }>(
      `/event-lotteries/${lotteryId}/announce`,
      { id_lucky: idLucky }
    );
  }

  async accept(
    lotteryId: number,
    idLucky: number
  ): Promise<{ data: LotteryLiveState }> {
    return this.post<{ data: LotteryLiveState }>(
      `/event-lotteries/${lotteryId}/accept`,
      { id_lucky: idLucky }
    );
  }

  async reject(
    lotteryId: number,
    idLucky: number
  ): Promise<{ data: LotteryLiveState }> {
    return this.post<{ data: LotteryLiveState }>(
      `/event-lotteries/${lotteryId}/reject`,
      { id_lucky: idLucky }
    );
  }

  async prizesBoard(lotteryId: number): Promise<{ data: any }> {
    return this.get<{ data: any }>(
      `/event-lotteries/${lotteryId}/prizes-board`
    );
  }
}

export const lotteryLiveApi = new LotteryLiveApiService();
