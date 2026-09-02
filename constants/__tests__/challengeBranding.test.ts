import {
  CHALLENGE_COORDINATOR_LOGO_MAX_HEIGHT,
  CHALLENGE_COORDINATOR_LOGOS,
  CHALLENGE_PRIZE_PARTNER_LOGO_MAX_HEIGHT,
  CHALLENGE_PRIZE_PARTNER_ROWS,
  challengeMediaUrl,
  fitLogoSize,
} from '@/constants/challengeBranding';

jest.mock('@/utils/constants', () => ({
  API_BASE_URL: 'http://localhost:8000/',
}));

describe('challengeBranding', () => {
  it('builds media URLs from API_BASE_URL without double slashes', () => {
    expect(challengeMediaUrl('coordinators/sense4fit-summit-2026.png')).toBe(
      'http://localhost:8000/media/sense4fit-summit-2026-padel-challenges/coordinators/sense4fit-summit-2026.png'
    );
  });

  it('uses independent prize partner and coordinator max heights', () => {
    expect(CHALLENGE_PRIZE_PARTNER_LOGO_MAX_HEIGHT).toBe(48);
    expect(CHALLENGE_COORDINATOR_LOGO_MAX_HEIGHT).toBe(95);
  });

  it('exports two coordinator logos and prize-partner rows of five then four', () => {
    expect(CHALLENGE_COORDINATOR_LOGOS).toHaveLength(2);
    expect(CHALLENGE_PRIZE_PARTNER_ROWS).toHaveLength(2);
    expect(CHALLENGE_PRIZE_PARTNER_ROWS[0]).toHaveLength(5);
    expect(CHALLENGE_PRIZE_PARTNER_ROWS[1]).toHaveLength(4);
    expect(CHALLENGE_PRIZE_PARTNER_ROWS[0][1]).toContain(
      'prize-sponsors/vitavea.png'
    );
    expect(CHALLENGE_PRIZE_PARTNER_ROWS[0][2]).toContain(
      'prize-sponsors/rom-autentic.png'
    );
    expect(CHALLENGE_PRIZE_PARTNER_ROWS[1][0]).toContain(
      'prize-sponsors/vitamin-aqua.png'
    );
    expect(CHALLENGE_PRIZE_PARTNER_ROWS[1][3]).toContain(
      'prize-sponsors/none-health.png'
    );
    expect(CHALLENGE_COORDINATOR_LOGOS[0]).toContain(
      'coordinators/sense4fit-summit-2026.png'
    );
    expect(CHALLENGE_COORDINATOR_LOGOS[1]).toContain(
      'coordinators/padel-one-yellow.png'
    );
  });

  describe('fitLogoSize', () => {
    it('upscales a small asset until one limit is hit', () => {
      expect(fitLogoSize(50, 25, 200, 80)).toEqual({ width: 160, height: 80 });
    });

    it('downscales a large asset to fit the box', () => {
      expect(fitLogoSize(400, 200, 100, 80)).toEqual({ width: 100, height: 50 });
    });

    it('preserves aspect ratio and never exceeds maxW/maxH', () => {
      const fitted = fitLogoSize(300, 100, 120, 80);
      expect(fitted.width).toBeLessThanOrEqual(120);
      expect(fitted.height).toBeLessThanOrEqual(80);
      expect(fitted.width / fitted.height).toBeCloseTo(3);
    });

    it('returns zeros when natural or max dimensions are non-positive', () => {
      expect(fitLogoSize(0, 10, 100, 80)).toEqual({ width: 0, height: 0 });
      expect(fitLogoSize(10, -1, 100, 80)).toEqual({ width: 0, height: 0 });
      expect(fitLogoSize(10, 10, 0, 80)).toEqual({ width: 0, height: 0 });
    });
  });
});
