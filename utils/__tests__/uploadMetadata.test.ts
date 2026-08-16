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
          path: '/api/v1/manager/eligibilities/{id}/student-proofs',
        },
        delete: {
          method: 'DELETE',
          path: '/api/v1/manager/eligibilities/{id}/student-proofs/{childId}',
        },
      },
    });
    expect(cfg?.form_field).toBe('file');
    expect(cfg?.mode).toBe('multi');
    expect(acceptsPdf(cfg!)).toBe(true);
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
