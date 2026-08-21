import {
  getImageConfig,
  getNestedValue,
  isListImageUrl,
} from '@/utils/imageMetadata';

describe('imageMetadata', () => {
  it('parses x-padeliz-image role list', () => {
    expect(
      getImageConfig({
        type: 'string',
        'x-padeliz-image': { role: 'list' },
      })
    ).toEqual({ role: 'list' });
  });

  it('parses nested x.padeliz-image', () => {
    expect(
      getImageConfig({
        type: 'string',
        x: { 'padeliz-image': { role: 'list' } },
      })
    ).toEqual({ role: 'list' });
  });

  it('returns null without list role', () => {
    expect(getImageConfig({ 'x-padeliz-image': { role: 'other' } })).toBeNull();
    expect(getImageConfig(null)).toBeNull();
  });

  it('allowlists image extensions', () => {
    expect(isListImageUrl('https://cdn.example/a.PNG')).toBe(true);
    expect(isListImageUrl('/storage/x.webp?v=1')).toBe(true);
    expect(isListImageUrl('https://cdn.example/a.mp4')).toBe(false);
    expect(isListImageUrl('')).toBe(false);
    expect(isListImageUrl(null)).toBe(false);
  });

  it('reads nested values', () => {
    expect(
      getNestedValue({ player: { profile_image_url: 'u.png' } }, 'player.profile_image_url')
    ).toBe('u.png');
    expect(getNestedValue({}, 'player.profile_image_url')).toBeUndefined();
  });
});
