import { PosterRow } from '@/types/api/edition';
import { BaseApiService } from './baseApi';

export class PostersApiService extends BaseApiService {
  async list(
    editionDivisionId: number
  ): Promise<{ data: PosterRow[] }> {
    return this.get<{ data: PosterRow[] }>(
      `/edition-divisions/${editionDivisionId}/posters`
    );
  }

  /**
   * Branding comes from the edition's organizer and club host, not the request.
   */
  async generateMatches(
    editionDivisionId: number,
    params: { court: number }
  ): Promise<{ data: PosterRow; message?: string }> {
    return this.post(`/edition-divisions/${editionDivisionId}/posters/matches`, {
      court: params.court,
    });
  }

  async generateRanking(
    editionDivisionId: number
  ): Promise<{ data: PosterRow; message?: string }> {
    return this.post(
      `/edition-divisions/${editionDivisionId}/posters/ranking`,
      {}
    );
  }

  async downloadMatchesPdf(
    editionDivisionId: number,
    params: { court: number },
    filename = 'matches.pdf'
  ): Promise<void> {
    await this.downloadPdf(
      `/edition-divisions/${editionDivisionId}/posters/matches/file?court=${params.court}`,
      filename,
      { method: 'GET' }
    );
  }

  async downloadRankingPdf(
    editionDivisionId: number,
    filename = 'ranking.pdf'
  ): Promise<void> {
    await this.downloadPdf(
      `/edition-divisions/${editionDivisionId}/posters/ranking/file`,
      filename,
      { method: 'GET' }
    );
  }

  async downloadPrinted(
    editionDivisionId: number,
    posterId: number,
    filename = 'printed.jpg'
  ): Promise<void> {
    await this.downloadNamedFile(
      `/edition-divisions/${editionDivisionId}/posters/${posterId}/printed/file`,
      filename,
      {
        method: 'GET',
        headers: { Accept: 'application/octet-stream,*/*' },
      }
    );
  }

  async uploadPrinted(
    editionDivisionId: number,
    posterId: number,
    file: Blob | File,
    filename = 'printed.jpg'
  ): Promise<{ data: PosterRow }> {
    const formData = new FormData();
    formData.append('image', file as any, filename);
    return this.requestFormData<{ data: PosterRow }>(
      `/edition-divisions/${editionDivisionId}/posters/${posterId}/printed`,
      formData
    );
  }
}

export const postersApi = new PostersApiService();
