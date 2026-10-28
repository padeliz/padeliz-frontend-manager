/**
 * Manager Authentication Context
 * Google OAuth runs through Manager BFF routes; Laravel receives the Google id_token.
 */

import { authService } from '@/services/auth';
import { ApiAuthUser } from '@/types/api/auth';
import { BASE_URL } from '@/utils/constants';
import {
  AuthRequestConfig,
  DiscoveryDocument,
  makeRedirectUri,
  useAuthRequest,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: ApiAuthUser | null;
  isLoading: boolean;
  error: string | null;
  /** Prompt Google via BFF, exchange code, then authenticate with Laravel. */
  signIn: () => Promise<void>;
  /** Authenticate against Laravel with an existing Google id_token. */
  signInWithGoogle: (googleToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const ManagerAuthProvider: React.FC<AuthProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<ApiAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';
  // Build auth request config inside the provider so importing this module
  // (e.g. AppLayout) does not call makeRedirectUri at load time in Jest.
  const googleConfig: AuthRequestConfig = React.useMemo(
    () => ({
      clientId: 'google',
      scopes: ['openid', 'profile', 'email'],
      redirectUri: makeRedirectUri(),
    }),
    []
  );
  const googleDiscovery: DiscoveryDocument = React.useMemo(
    () => ({
      authorizationEndpoint: `${BASE_URL}/api/auth/authorize`,
      tokenEndpoint: `${BASE_URL}/api/auth/token`,
    }),
    []
  );
  const [request, response, promptAsync] = useAuthRequest(
    googleConfig,
    googleDiscovery
  );
  const processedResponseRef = useRef<unknown>(null);

  useEffect(() => {
    void initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const isAuthenticated = await authService.isAuthenticated();

      if (isAuthenticated) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } else {
        const storedUser = await authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
      }
    } catch (err) {
      console.error(
        '❌ ManagerAuthProvider: Auth initialization error:',
        err
      );
      setError('Failed to initialize authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeCodeForGoogleIdToken = useCallback(
    async (code: string, codeVerifier?: string) => {
      const formData = new FormData();
      formData.append('code', code);
      if (isWeb) formData.append('platform', 'web');
      if (codeVerifier) formData.append('code_verifier', codeVerifier);

      const tokenResponse = await fetch(`${BASE_URL}/api/auth/token`, {
        method: 'POST',
        body: formData,
        credentials: isWeb ? 'include' : 'same-origin',
      });
      const payload = await tokenResponse.json();

      const idToken: string | undefined = payload?.googleIdToken;
      if (!idToken) {
        throw new Error('No Google id_token returned from token exchange');
      }
      return idToken;
    },
    [isWeb]
  );

  const signInWithGoogle = useCallback(async (googleToken: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const authResponse =
        await authService.authenticateWithGoogle(googleToken);

      setUser(authResponse.user);
    } catch (err) {
      console.error('❌ ManagerAuthProvider: Google sign-in error:', err);

      setError(
        err instanceof Error ? err.message : 'Google sign-in failed'
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!response || processedResponseRef.current === response) return;
    processedResponseRef.current = response;

    if (response.type === 'error') {
      const err =
        (response.error as unknown as Error) ??
        new Error('Google sign-in failed');
      setError(err.message);
      return;
    }
    if (response.type === 'cancel' || response.type === 'dismiss') {
      setError('Google sign-in was cancelled');
      return;
    }
    if (response.type !== 'success') return;

    const codeVerifier = request?.codeVerifier;
    void (async () => {
      setIsLoading(true);
      try {
        const { code } = response.params;
        const idToken = await exchangeCodeForGoogleIdToken(code, codeVerifier);
        await signInWithGoogle(idToken);
      } catch (e) {
        const err = e as Error;
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const signIn = useCallback(async () => {
    setError(null);
    const result = await promptAsync();
    if (!result) return;
    if (result.type === 'cancel' || result.type === 'dismiss') {
      const err = new Error('Google sign-in was cancelled');
      setError(err.message);
      throw err;
    }
    if (result.type === 'error') {
      const err =
        (result.error as unknown as Error) ??
        new Error('Google sign-in failed');
      setError(err.message);
      throw err;
    }
  }, [promptAsync]);

  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.logout();
      setUser(null);
    } catch (err) {
      console.error('❌ ManagerAuthProvider: Sign-out error:', err);
      setError(err instanceof Error ? err.message : 'Sign-out failed');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      setError(null);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('❌ ManagerAuthProvider: Refresh user error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to refresh user data'
      );
      setUser(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    signIn,
    signInWithGoogle,
    signOut,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
