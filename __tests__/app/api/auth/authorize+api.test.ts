const BASE = 'https://manager.example.test';
const SCHEME = 'padeliz-manager://';
const GOOGLE_ID = 'google-client-id';

function setAuthEnv(overrides: Record<string, string | undefined> = {}) {
  const env: Record<string, string | undefined> = {
    EXPO_PUBLIC_BASE_URL: BASE,
    EXPO_PUBLIC_SCHEME: SCHEME,
    GOOGLE_CLIENT_ID: GOOGLE_ID,
    GOOGLE_CLIENT_SECRET: 'secret',
    JWT_SECRET: 'test-jwt-secret-at-least-32-chars-long!!',
    ...overrides,
  };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  jest.resetModules();
}

function loadAuthorize() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/app/api/auth/authorize+api') as {
    GET: (request: Request) => Promise<Response>;
  };
}

describe('authorize+api', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('returns 500 when BASE_URL is missing', async () => {
    setAuthEnv({ EXPO_PUBLIC_BASE_URL: undefined });
    const { GET } = loadAuthorize();
    const res = await GET(
      new Request(
        `https://x/api/auth/authorize?client_id=google&redirect_uri=${SCHEME}&state=s`
      )
    );
    expect(res.status).toBe(500);
  });

  it('returns 500 when APP_SCHEME is missing', async () => {
    setAuthEnv({ EXPO_PUBLIC_SCHEME: undefined });
    const { GET } = loadAuthorize();
    const res = await GET(
      new Request(
        `https://x/api/auth/authorize?client_id=google&redirect_uri=${encodeURIComponent(BASE)}&state=s`
      )
    );
    expect(res.status).toBe(500);
  });

  it('returns 500 when GOOGLE_CLIENT_ID is missing', async () => {
    setAuthEnv({ GOOGLE_CLIENT_ID: undefined });
    const { GET } = loadAuthorize();
    const res = await GET(
      new Request(
        `https://x/api/auth/authorize?client_id=google&redirect_uri=${encodeURIComponent(BASE)}&state=s`
      )
    );
    expect(res.status).toBe(500);
  });

  it('returns 400 for invalid client_id', async () => {
    setAuthEnv();
    const { GET } = loadAuthorize();
    const res = await GET(
      new Request(
        `https://x/api/auth/authorize?client_id=other&redirect_uri=${encodeURIComponent(BASE)}&state=s`
      )
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid redirect_uri', async () => {
    setAuthEnv();
    const { GET } = loadAuthorize();
    const res = await GET(
      new Request(
        'https://x/api/auth/authorize?client_id=google&redirect_uri=https://evil.test&state=s'
      )
    );
    expect(res.status).toBe(400);
  });

  it('redirects to Google for web with web| state prefix', async () => {
    setAuthEnv();
    const { GET } = loadAuthorize();
    const res = await GET(
      new Request(
        `https://x/api/auth/authorize?client_id=google&redirect_uri=${encodeURIComponent(BASE)}&state=clientState&scope=openid`
      )
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('Location')!;
    expect(location.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')).toBe(
      true
    );
    const params = new URL(location).searchParams;
    expect(params.get('client_id')).toBe(GOOGLE_ID);
    expect(params.get('redirect_uri')).toBe(`${BASE}/api/auth/callback`);
    expect(params.get('state')).toBe('web|clientState');
  });

  it('redirects to Google for mobile with mobile| state prefix', async () => {
    setAuthEnv();
    const { GET } = loadAuthorize();
    const res = await GET(
      new Request(
        `https://x/api/auth/authorize?client_id=google&redirect_uri=${encodeURIComponent(SCHEME)}&state=mState`
      )
    );
    expect(res.status).toBe(302);
    const params = new URL(res.headers.get('Location')!).searchParams;
    expect(params.get('state')).toBe('mobile|mState');
  });
});
