import { resolvePrizeMedia } from '@/utils/edition/lotteryMedia';

describe('lotteryMedia video detection', () => {
  it('treats mp4 webm mov as video', () => {
    expect(
      resolvePrizeMedia({ url: 'https://example.com/a.mp4' }).isVideo
    ).toBe(true);
    expect(
      resolvePrizeMedia({ url: '/storage/prizes/1/a.webm' }).isVideo
    ).toBe(true);
    expect(
      resolvePrizeMedia({ url: 'https://example.com/a.mov' }).isVideo
    ).toBe(true);
    expect(
      resolvePrizeMedia({ url: 'https://example.com/a.png' }).isVideo
    ).toBe(false);
  });
});
