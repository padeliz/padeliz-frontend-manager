/**
 * @jest-environment jsdom
 */
import { PlayerProfileImageImportApiService } from '@/services/api/playerProfileImageImportApi';

describe('PlayerProfileImageImportApiService.save', () => {
  it('builds files[index] multipart entries for web uploads', async () => {
    const append = jest.fn();
    const originalFormData = global.FormData;
    global.FormData = jest.fn().mockImplementation(() => ({ append })) as any;

    const service = new PlayerProfileImageImportApiService();
    const file = { name: 'mara.jpg' } as File;
    (service as any).uploadFormData = jest.fn(async () => ({ data: {}, message: 'ok' }));

    await service.save({
      original_filename: 'batch',
      rows: [
        {
          index: 0,
          filename: 'mara.jpg',
          player_id: 12,
          is_pdf_primary: true,
        },
      ],
      filesByIndex: {
        0: {
          uri: 'blob:test',
          name: 'mara.jpg',
          mimeType: 'image/jpeg',
          file,
        },
      },
    });

    expect(append).toHaveBeenCalledWith('files[0]', file);

    global.FormData = originalFormData;
  });

  it('builds native multipart entries when no File is available', async () => {
    const append = jest.fn();
    const originalFormData = global.FormData;
    global.FormData = jest.fn().mockImplementation(() => ({ append })) as any;

    const service = new PlayerProfileImageImportApiService();
    (service as any).uploadFormData = jest.fn(async () => ({ data: {}, message: 'ok' }));

    await service.save({
      original_filename: 'batch',
      rows: [
        {
          index: 1,
          filename: 'photo.jpg',
          player_id: 3,
          is_pdf_primary: false,
        },
      ],
      filesByIndex: {
        1: {
          uri: 'file:///photo.jpg',
          name: 'photo.jpg',
          mimeType: 'image/jpeg',
        },
      },
    });

    expect(append).toHaveBeenCalledWith('files[1]', {
      uri: 'file:///photo.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    });

    global.FormData = originalFormData;
  });
});
