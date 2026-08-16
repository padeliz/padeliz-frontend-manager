import { ScratchSchedulePayload, SchedulePreview } from '@/types/api/edition';
import { BaseApiService } from './baseApi';

export class ScratchScheduleApiService extends BaseApiService {
  async preview(
    payload: ScratchSchedulePayload
  ): Promise<{ data: SchedulePreview; message?: string }> {
    return this.post<{ data: SchedulePreview; message?: string }>(
      '/tools/schedule/preview',
      payload
    );
  }

  async downloadMatchesPdf(
    payload: ScratchSchedulePayload,
    filename = 'scratch-matches.pdf'
  ): Promise<void> {
    await this.downloadPdf('/tools/schedule/pdf/matches', filename, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async downloadRankingPdf(
    payload: ScratchSchedulePayload,
    filename = 'scratch-ranking.pdf'
  ): Promise<void> {
    await this.downloadPdf('/tools/schedule/pdf/ranking', filename, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const scratchScheduleApi = new ScratchScheduleApiService();
