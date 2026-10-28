const BASE = 'https://manager.example.test';
const JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long!!';

jest.mock('jose', () => {
  class SignJWT {
    setProtectedHeader() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    setSubject() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    async sign() {
      return 'signed-jwt';
    }
  }
  return {
    SignJWT,
    decodeJwt: () => ({
      sub: 'google-sub-1',
      email: 'a@b.co',
      name: 'A',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  };
});

function setAuthEnv(overrides: Record<string, string | undefined> = {}) {
  const env: Record<string, string | undefined> = {
    EXPO_PUBLIC_BASE_URL: BASE,
    EXPO_PUBLIC_SCHEME: 'padeliz-manager://',
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-secret',
    JWT_SECRET,
    ...overrides,
  };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  jest.resetModules();
}

function loadToken() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/app/api/auth/token+api') as {
    POST: (request: Request) => Promise<Response>;
  };
}

describe('token+api', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetModules();
  });

  it('returns 500 when Google credentials are missing', async () => {
    setAuthEnv({ GOOGLE_CLIENT_ID: undefined, GOOGLE_CLIENT_SECRET: undefined });
    const { POST } = loadToken();
    const form = new FormData();
    form.append('code', 'x');
    const res = await POST(
      new Request('https://x/api/auth/token', { method: 'POST', body: form })
    );
    expect(res.status).toBe(500);
  });

  it('returns 400 when code is missing', async () => {
    setAuthEnv();
    const { POST } = loadToken();
    const form = new FormData();
    const res = await POST(
      new Request('https://x/api/auth/token', { method: 'POST', body: form })
    );
    expect(res.status).toBe(400);
  });

  it('returns googleIdToken and sets cookies for web platform', async () => {
    setAuthEnv();
    const idToken = 'google-id-token-jwt';
    global.fetch = jest.fn(async () =>
      Response.json({ id_token: idToken })
    ) as unknown as typeof fetch;

    const { POST } = loadToken();
    const form = new FormData();
    form.append('code', 'auth-code');
    form.append('platform', 'web');
    const res = await POST(
      new Request('https://x/api/auth/token', { method: 'POST', body: form })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.googleIdToken).toBe(idToken);
    expect(body.success).toBe(true);

    const cookies = res.headers.getSetCookie?.() ?? [];
    const cookieHeader = cookies.length
      ? cookies.join('\n')
      : res.headers.get('Set-Cookie') ?? '';
    expect(cookieHeader).toContain('auth_token=');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.any(Object)
    );
  });
});
