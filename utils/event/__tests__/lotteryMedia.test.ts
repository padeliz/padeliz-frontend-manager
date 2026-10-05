import {
  resolvePrizeMedia,
  resolvePrizeMediaUrl,
  shouldAutoAnnounce,
} from '@/utils/event/lotteryMedia';

describe('resolvePrizeMediaUrl', () => {
  it('leaves absolute https URLs unchanged', () => {
    expect(resolvePrizeMediaUrl('https://example.com/p.png')).toBe(
      'https://example.com/p.png'
    );
  });

  it('absolutizes /storage paths against API_BASE_URL fallback', () => {
    expect(resolvePrizeMediaUrl('/storage/prizes/38/x.png')).toBe(
      'http://localhost:8000/storage/prizes/38/x.png'
    );
    expect(resolvePrizeMediaUrl('storage/prizes/38/x.png')).toBe(
      'http://localhost:8000/storage/prizes/38/x.png'
    );
  });

  it('rejects disk-relative prize media paths', () => {
    expect(resolvePrizeMediaUrl('prizes/38/media/x.png')).toBeNull();
    expect(resolvePrizeMediaUrl('/prizes/38/media/x.png')).toBeNull();
    expect(resolvePrizeMediaUrl('/media/prize.png')).toBeNull();
  });
});

describe('resolvePrizeMedia', () => {
  it('prefers media_url and is_video', () => {
    expect(
      resolvePrizeMedia({
        media_url: 'https://example.com/p.mp4',
        is_video: true,
        name: 'Balls',
      })
    ).toEqual({ url: 'https://example.com/p.mp4', isVideo: true });
  });

  it('detects video from extension when is_video missing', () => {
    expect(
      resolvePrizeMedia({ media_url: 'https://example.com/prize.webm' })
    ).toEqual({ url: 'https://example.com/prize.webm', isVideo: true });
  });

  it('returns image when not video', () => {
    expect(
      resolvePrizeMedia({
        media_url: 'https://example.com/prize.png',
        is_video: false,
      })
    ).toEqual({ url: 'https://example.com/prize.png', isVideo: false });
  });

  it('absolutizes storage media_url', () => {
    expect(
      resolvePrizeMedia({
        media_url: '/storage/prizes/38/x.png',
        is_video: false,
      })
    ).toEqual({
      url: 'http://localhost:8000/storage/prizes/38/x.png',
      isVideo: false,
    });
  });

  it('rejects remapped disk media_path fed as media_url', () => {
    expect(
      resolvePrizeMedia({ media_url: 'prizes/38/media/x.png' })
    ).toEqual({ url: null, isVideo: false });
  });

  it('uses Storage url field when present', () => {
    expect(
      resolvePrizeMedia({
        url: '/storage/prizes/1/media/x.png',
        media_path: 'prizes/1/media/x.png',
      })
    ).toEqual({
      url: 'http://localhost:8000/storage/prizes/1/media/x.png',
      isVideo: false,
    });
  });

  it('handles null prize', () => {
    expect(resolvePrizeMedia(null)).toEqual({ url: null, isVideo: false });
  });
});

describe('shouldAutoAnnounce', () => {
  it('is true when seconds_left <= 0 and not announced', () => {
    expect(shouldAutoAnnounce({ seconds_left: 0 })).toBe(true);
    expect(shouldAutoAnnounce({ seconds_left: -1 })).toBe(true);
  });

  it('is false when still counting down or already announced', () => {
    expect(shouldAutoAnnounce({ seconds_left: 5 })).toBe(false);
    expect(
      shouldAutoAnnounce({ seconds_left: 0, announced_at: 123 })
    ).toBe(false);
    expect(shouldAutoAnnounce(null)).toBe(false);
  });
});
