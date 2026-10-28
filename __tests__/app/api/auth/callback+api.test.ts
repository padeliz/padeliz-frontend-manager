const BASE = 'https://manager.example.test';
const SCHEME = 'padeliz-manager://';

function setAuthEnv() {
  process.env.EXPO_PUBLIC_BASE_URL = BASE;
  process.env.EXPO_PUBLIC_SCHEME = SCHEME;
  process.env.GOOGLE_CLIENT_ID = 'id';
  process.env.GOOGLE_CLIENT_SECRET = 'secret';
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long!!';
  jest.resetModules();
}

function loadCallback() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/app/api/auth/callback+api') as {
    GET: (request: Request) => Promise<Response>;
  };
}

describe('callback+api', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('returns 400 when state is missing', async () => {
    setAuthEnv();
    const { GET } = loadCallback();
    const res = await GET(
      new Request('https://x/api/auth/callback?code=abc')
    );
    expect(res.status).toBe(400);
  });

  it('redirects web platform to BASE_URL with code and client state', async () => {
    setAuthEnv();
    const { GET } = loadCallback();
    const res = await GET(
      new Request(
        'https://x/api/auth/callback?code=authcode&state=web%7CclientState'
      )
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('Location')!;
    expect(location.startsWith(BASE)).toBe(true);
    const params = new URL(location).searchParams;
    expect(params.get('code')).toBe('authcode');
    expect(params.get('state')).toBe('clientState');
  });

  it('redirects mobile platform to APP_SCHEME with code and client state', async () => {
    setAuthEnv();
    const { GET } = loadCallback();
    const res = await GET(
      new Request(
        'https://x/api/auth/callback?code=authcode&state=mobile%7CmState'
      )
    );
    expect(res.status).toBe(302);
    const location = res.headers.get('Location')!;
    expect(location.startsWith(`${SCHEME}?`)).toBe(true);
    expect(location).toContain('code=authcode');
    expect(location).toContain('state=mState');
  });
});
