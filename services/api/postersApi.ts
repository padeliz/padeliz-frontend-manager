import { PosterRow } from '@/types/api/event';
import { BaseApiService } from './baseApi';

export class PostersApiService extends BaseApiService {
  async list(
    eventDivisionId: number
  ): Promise<{ data: PosterRow[] }> {
    return this.get<{ data: PosterRow[] }>(
      `/event-divisions/${eventDivisionId}/posters`
    );
  }

  /**
   * Branding comes from the event's organizer and club host, not the request.
   */
  async generateMatches(
    eventDivisionId: number,
    params: { court: number }
  ): Promise<{ data: PosterRow; message?: string }> {
    return this.post(`/event-divisions/${eventDivisionId}/posters/matches`, {
      court: params.court,
    });
  }

  async generateRanking(
    eventDivisionId: number
  ): Promise<{ data: PosterRow; message?: string }> {
    return this.post(
      `/event-divisions/${eventDivisionId}/posters/ranking`,
      {}
    );
  }

  async downloadMatchesPdf(
    eventDivisionId: number,
    params: { court: number },
    filename = 'matches.pdf'
  ): Promise<void> {
    await this.downloadPdf(
      `/event-divisions/${eventDivisionId}/posters/matches/file?court=${params.court}`,
      filename,
      { method: 'GET' }
    );
  }

  async downloadRankingPdf(
    eventDivisionId: number,
    filename = 'ranking.pdf'
  ): Promise<void> {
    await this.downloadPdf(
      `/event-divisions/${eventDivisionId}/posters/ranking/file`,
      filename,
      { method: 'GET' }
    );
  }

  async downloadPrinted(
    eventDivisionId: number,
    posterId: number,
    filename = 'printed.jpg'
  ): Promise<void> {
    await this.downloadNamedFile(
      `/event-divisions/${eventDivisionId}/posters/${posterId}/printed/file`,
      filename,
      {
        method: 'GET',
        headers: { Accept: 'application/octet-stream,*/*' },
      }
    );
  }

  async uploadPrinted(
    eventDivisionId: number,
    posterId: number,
    file: Blob | File,
    filename = 'printed.jpg'
  ): Promise<{ data: PosterRow }> {
    const formData = new FormData();
    formData.append('image', file as any, filename);
    return this.requestFormData<{ data: PosterRow }>(
      `/event-divisions/${eventDivisionId}/posters/${posterId}/printed`,
      formData
    );
  }
}

export const postersApi = new PostersApiService();
