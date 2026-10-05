import { PosterRow } from '@/types/api/event';
import { ApiError, BaseApiService } from './baseApi';

export class EventPostersApiService extends BaseApiService {
  async listEventPosters(
    eventId: number
  ): Promise<{ data: PosterRow[] }> {
    return this.get<{ data: PosterRow[] }>(`/events/${eventId}/posters`);
  }

  async generateAttendance(
    eventId: number
  ): Promise<{ data: PosterRow; message?: string }> {
    return this.post(`/events/${eventId}/posters/attendance`, {});
  }

  async downloadAttendancePdf(
    eventId: number,
    filename = 'attendance.pdf'
  ): Promise<void> {
    await this.downloadPdf(
      `/events/${eventId}/posters/attendance/file`,
      filename,
      { method: 'GET' }
    );
  }

  async openAttendancePreview(eventId: number): Promise<void> {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      throw new ApiError(
        501,
        'Attendance preview is only supported on web in the manager app'
      );
    }

    const html = await this.requestText(
      `/events/${eventId}/posters/attendance/preview`,
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
    eventId: number,
    filename = 'merged-posters.pdf'
  ): Promise<void> {
    await this.downloadPdf(
      `/events/${eventId}/posters/merged/file`,
      filename,
      { method: 'GET' }
    );
  }
}

export const eventPostersApi = new EventPostersApiService();
