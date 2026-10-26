import React from 'react';
import { Pressable, Text } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { ManagerAuthProvider, useAuth } from '@/context/managerAuth';
import { authService } from '@/services/auth';

const mockPromptAsync = jest.fn();
let mockResponse: {
  type: string;
  params?: Record<string, string>;
  error?: Error;
} | null = null;
let mockRequest: { codeVerifier?: string } | null = {
  codeVerifier: 'verifier',
};

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'https://manager.example.test',
  useAuthRequest: () => [mockRequest, mockResponse, mockPromptAsync],
}));

jest.mock('@/utils/constants', () => ({
  BASE_URL: 'https://manager.example.test',
}));

jest.mock('@/services/auth', () => ({
  authService: {
    isAuthenticated: jest.fn(async () => false),
    getStoredUser: jest.fn(async () => null),
    getCurrentUser: jest.fn(),
    authenticateWithGoogle: jest.fn(async () => ({
      token: 'laravel-token',
      user: {
        id_user: 1,
        name: 'Mgr User',
        first_name: 'Mgr',
        last_name: 'User',
        being_student: false,
        inserted_at: 1,
        emails: [
          {
            id_user_email: 1,
            email: 'mgr@padeliz.ro',
            purposes: ['login'],
            is_primary: true,
          },
        ],
      },
    })),
    logout: jest.fn(),
  },
}));

function Probe() {
  const { signIn, user, error, clearError } = useAuth();
  return (
    <>
      <Text testID="email">{user?.emails?.[0]?.email ?? 'none'}</Text>
      <Text testID="error">{error ?? ''}</Text>
      <Pressable testID="sign-in" onPress={() => void signIn()}>
        <Text>sign-in</Text>
      </Pressable>
      <Pressable testID="clear-error" onPress={clearError}>
        <Text>clear</Text>
      </Pressable>
    </>
  );
}

describe('managerAuth Google BFF flow', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockResponse = null;
    mockRequest = { codeVerifier: 'verifier' };
    mockPromptAsync.mockResolvedValue({
      type: 'success',
      params: { code: 'c' },
    });
    global.fetch = jest.fn(async () =>
      Response.json({ googleIdToken: 'google-id-token' })
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('exchanges code via BFF then authenticates with Laravel', async () => {
    const { rerender } = render(
      <ManagerAuthProvider>
        <Probe />
      </ManagerAuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('email').props.children).toBe('none')
    );

    mockResponse = { type: 'success', params: { code: 'auth-code' } };
    rerender(
      <ManagerAuthProvider>
        <Probe />
      </ManagerAuthProvider>
    );

    await waitFor(() =>
      expect(authService.authenticateWithGoogle).toHaveBeenCalledWith(
        'google-id-token'
      )
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'https://manager.example.test/api/auth/token',
      expect.objectContaining({ method: 'POST' })
    );
    await waitFor(() =>
      expect(screen.getByTestId('email').props.children).toBe('mgr@padeliz.ro')
    );
  });

  it('does not process the same success response twice', async () => {
    mockResponse = { type: 'success', params: { code: 'auth-code' } };

    render(
      <ManagerAuthProvider>
        <Probe />
      </ManagerAuthProvider>
    );

    await waitFor(() =>
      expect(authService.authenticateWithGoogle).toHaveBeenCalledTimes(1)
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('clear-error'));
    });

    expect(authService.authenticateWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('does not call Laravel on cancel', async () => {
    mockResponse = { type: 'cancel' };

    render(
      <ManagerAuthProvider>
        <Probe />
      </ManagerAuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('error').props.children).toBe(
        'Google sign-in was cancelled'
      )
    );
    expect(authService.authenticateWithGoogle).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('signIn prompts the auth session', async () => {
    render(
      <ManagerAuthProvider>
        <Probe />
      </ManagerAuthProvider>
    );

    await waitFor(() => screen.getByTestId('sign-in'));
    fireEvent.press(screen.getByTestId('sign-in'));

    await waitFor(() => expect(mockPromptAsync).toHaveBeenCalled());
  });
});
