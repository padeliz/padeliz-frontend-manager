import { resolvePrizeMedia } from '@/utils/edition/lotteryMedia';

describe('lotteryMedia video detection', () => {
  it('treats mp4 webm mov as video', () => {
    expect(resolvePrizeMedia({ url: '/a.mp4' }).isVideo).toBe(true);
    expect(resolvePrizeMedia({ url: '/a.webm' }).isVideo).toBe(true);
    expect(resolvePrizeMedia({ url: '/a.mov' }).isVideo).toBe(true);
    expect(resolvePrizeMedia({ url: '/a.png' }).isVideo).toBe(false);
  });
});
