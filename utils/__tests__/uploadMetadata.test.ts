import {
  acceptsPdf,
  getUploadConfig,
  resolveUploadPath,
  toManagerEndpoint,
} from '@/utils/uploadMetadata';

describe('uploadMetadata', () => {
  it('parses x-padeliz-upload and detects PDF accept', () => {
    const cfg = getUploadConfig({
      type: 'array',
      'x-padeliz-upload': {
        mode: 'multi',
        max_files: 3,
        max_size_kb: 30720,
        accept: ['image/jpeg', 'application/pdf'],
        form_field: 'file',
        upload: {
          method: 'POST',
          path: '/api/v1/manager/players/{id}/profile-images',
        },
        delete: {
          method: 'DELETE',
          path: '/api/v1/manager/players/{id}/profile-images/{childId}',
        },
      },
    });
    expect(cfg?.form_field).toBe('file');
    expect(cfg?.mode).toBe('multi');
    expect(cfg?.required).toBe(false);
    expect(acceptsPdf(cfg!)).toBe(true);
  });

  it('parses required upload flag and omits delete when absent', () => {
    const cfg = getUploadConfig({
      type: 'string',
      'x-padeliz-upload': {
        mode: 'single',
        form_field: 'file',
        required: true,
        accept: ['image/png'],
        upload: {
          method: 'POST',
          path: '/api/v1/manager/events/{id}/cover',
        },
      },
    });
    expect(cfg?.required).toBe(true);
    expect(cfg?.delete).toBeNull();
  });

  it('resolves path placeholders and strips manager prefix', () => {
    const path = resolveUploadPath(
      '/api/v1/manager/players/{id}/profile-images/{childId}',
      { id: 9, childId: 3 }
    );
    expect(path).toContain('/players/9/profile-images/3');
    expect(toManagerEndpoint(path)).toBe('/players/9/profile-images/3');
  });
});
