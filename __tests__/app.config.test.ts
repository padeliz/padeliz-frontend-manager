describe('app.config identity', () => {
  const prev = process.env.EXPO_PUBLIC_BASE_URL;
  const PLAYER_PROJECT_ID = 'dbc9eec8-2aba-4de7-a421-f28ade8c85c7';
  const MANAGER_PROJECT_ID = 'a6ab7b60-0498-49f4-84d6-f8d9089592ce';

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.EXPO_PUBLIC_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_BASE_URL = prev;
    }
    jest.resetModules();
  });

  function loadConfig() {
    process.env.EXPO_PUBLIC_BASE_URL = 'https://manager.example.test';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../app.config.js') as {
      expo: {
        name: string;
        slug: string;
        scheme: string;
        owner: string;
        ios: { bundleIdentifier: string };
        android: { package: string };
        extra: { eas: { projectId: string } };
      };
    };
  }

  it('uses Padeliz Manager identity with a distinct EAS projectId', () => {
    const config = loadConfig();
    expect(config.expo.name).toBe('Padeliz Manager');
    expect(config.expo.slug).toBe('padeliz-manager');
    expect(config.expo.scheme).toBe('padeliz-manager');
    expect(config.expo.ios.bundleIdentifier).toBe('com.padeliz.manager');
    expect(config.expo.android.package).toBe('com.padeliz.manager');
    expect(config.expo.extra.eas.projectId).toBe(MANAGER_PROJECT_ID);
    expect(config.expo.extra.eas.projectId).not.toBe(PLAYER_PROJECT_ID);
  });
});
