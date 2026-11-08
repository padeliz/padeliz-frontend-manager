describe('noindexMeta', () => {
  const original = process.env.EXPO_PUBLIC_NOINDEX;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_NOINDEX;
    } else {
      process.env.EXPO_PUBLIC_NOINDEX = original;
    }
    jest.resetModules();
  });

  it('returns null robots content when unset', () => {
    delete process.env.EXPO_PUBLIC_NOINDEX;
    jest.resetModules();
    const { robotsMetaContent, shouldNoindex } = require('../noindexMeta');
    expect(shouldNoindex()).toBe(false);
    expect(robotsMetaContent()).toBeNull();
  });

  it('returns full noindex directives when EXPO_PUBLIC_NOINDEX=true', () => {
    process.env.EXPO_PUBLIC_NOINDEX = 'true';
    jest.resetModules();
    const { robotsMetaContent, shouldNoindex, NOINDEX_ROBOTS_CONTENT } =
      require('../noindexMeta');
    expect(shouldNoindex()).toBe(true);
    expect(robotsMetaContent()).toBe(NOINDEX_ROBOTS_CONTENT);
    expect(robotsMetaContent()).toBe(
      'noindex, nofollow, noarchive, nosnippet, noimageindex',
    );
  });
});
