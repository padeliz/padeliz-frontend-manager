import {
  ALL_CHROME_REGIONS,
  buildLayoutChromeHref,
  isRegionVisible,
  parseLayoutChromeParams,
  stripLayoutChromeQuery,
  withLayoutChromeQuery,
} from '@/utils/layoutChrome';

describe('layoutChrome', () => {
  it('defaults to all regions visible', () => {
    const { visibility, isFullscreen } = parseLayoutChromeParams({});
    for (const region of ALL_CHROME_REGIONS) {
      expect(visibility[region]).toBe(true);
    }
    expect(isFullscreen).toBe(false);
  });

  it('fs=1 hides all regions and sets isFullscreen', () => {
    const { visibility, isFullscreen } = parseLayoutChromeParams({ fs: '1' });
    for (const region of ALL_CHROME_REGIONS) {
      expect(visibility[region]).toBe(false);
    }
    expect(isFullscreen).toBe(true);
  });

  it('fs=true behaves like fs=1', () => {
    const { visibility, isFullscreen } = parseLayoutChromeParams({ fs: 'true' });
    for (const region of ALL_CHROME_REGIONS) {
      expect(visibility[region]).toBe(false);
    }
    expect(isFullscreen).toBe(true);
  });

  it('fs=0 is not fullscreen', () => {
    const { visibility, isFullscreen } = parseLayoutChromeParams({ fs: '0' });
    for (const region of ALL_CHROME_REGIONS) {
      expect(visibility[region]).toBe(true);
    }
    expect(isFullscreen).toBe(false);
  });

  it('partial hide=nav,tabs hides only those regions', () => {
    const { visibility, isFullscreen } = parseLayoutChromeParams({
      hide: 'nav,tabs',
    });
    expect(visibility.nav).toBe(false);
    expect(visibility.tabs).toBe(false);
    expect(visibility.sidebar).toBe(true);
    expect(isFullscreen).toBe(false);
  });

  it('fs=1 wins over hide list', () => {
    const { visibility, isFullscreen } = parseLayoutChromeParams({
      fs: '1',
      hide: 'nav',
    });
    for (const region of ALL_CHROME_REGIONS) {
      expect(visibility[region]).toBe(false);
    }
    expect(isFullscreen).toBe(true);
  });

  it('ignores unknown hide keys', () => {
    const { visibility } = parseLayoutChromeParams({
      hide: 'nav,unknown,sidebar',
    });
    expect(visibility.nav).toBe(false);
    expect(visibility.sidebar).toBe(false);
    expect(visibility.header).toBe(true);
  });

  it('isRegionVisible matches visibility record', () => {
    const { visibility } = parseLayoutChromeParams({ hide: 'header' });
    expect(isRegionVisible(visibility, 'header')).toBe(false);
    expect(isRegionVisible(visibility, 'nav')).toBe(true);
  });

  it('withLayoutChromeQuery preserves unrelated keys', () => {
    expect(
      withLayoutChromeQuery('/events/1/lottery/luckies?ed=2&lottery=3', {
        fs: true,
      })
    ).toBe('/events/1/lottery/luckies?ed=2&lottery=3&fs=1');
  });

  it('withLayoutChromeQuery sets hide list', () => {
    expect(
      withLayoutChromeQuery('/challenges/kotc/1', { hide: ['nav', 'tabs'] })
    ).toBe('/challenges/kotc/1?hide=nav%2Ctabs');
  });

  it('buildLayoutChromeHref merges pathname and params', () => {
    expect(
      buildLayoutChromeHref(
        '/events/1/lottery/luckies',
        { ed: '2', lottery: '3' },
        { fs: true }
      )
    ).toBe('/events/1/lottery/luckies?ed=2&lottery=3&fs=1');
  });

  it('stripLayoutChromeQuery removes fs and hide from href', () => {
    expect(
      stripLayoutChromeQuery('/path?fs=1&hide=nav&ed=2')
    ).toBe('/path?ed=2');
  });

  it('stripLayoutChromeQuery removes fs and hide from params object', () => {
    expect(
      stripLayoutChromeQuery({ fs: '1', hide: 'nav', ed: '2', id: '1' })
    ).toEqual({ ed: '2', id: '1' });
  });
});
