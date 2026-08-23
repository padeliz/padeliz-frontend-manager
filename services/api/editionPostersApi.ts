import { PosterRow } from '@/types/api/edition';
import { ApiError, BaseApiService } from './baseApi';

export class EditionPostersApiService extends BaseApiService {
  async listEditionPosters(
    editionId: number
  ): Promise<{ data: PosterRow[] }> {
    return this.get<{ data: PosterRow[] }>(`/editions/${editionId}/posters`);
  }

  async generateAttendance(
    editionId: number
  ): Promise<{ data: PosterRow; message?: string }> {
    return this.post(`/editions/${editionId}/posters/attendance`, {});
  }

  async downloadAttendancePdf(
    editionId: number,
    filename = 'attendance.pdf'
  ): Promise<void> {
    await this.downloadPdf(
      `/editions/${editionId}/posters/attendance/file`,
      filename,
      { method: 'GET' }
    );
  }

  async openAttendancePreview(editionId: number): Promise<void> {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      throw new ApiError(
        501,
        'Attendance preview is only supported on web in the manager app'
      );
    }

    const html = await this.requestText(
      `/editions/${editionId}/posters/attendance/preview`,
      { method: 'GET' }
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const previewWindow = window.open(blobUrl, '_blank');

    if (!previewWindow) {
      URL.revokeObjectURL(blobUrl);
      throw new ApiError(500, 'Failed to open attendance preview window');
    }

    previewWindow.addEventListener('load', () => {
      URL.revokeObjectURL(blobUrl);
    });
  }

  async downloadMergedPostersPdf(
    editionId: number,
    filename = 'merged-posters.pdf'
  ): Promise<void> {
    await this.downloadPdf(
      `/editions/${editionId}/posters/merged/file`,
      filename,
      { method: 'GET' }
    );
  }
}

export const editionPostersApi = new EditionPostersApiService();
