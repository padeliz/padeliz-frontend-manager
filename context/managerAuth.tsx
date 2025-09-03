/**
 * Manager Authentication Context
 * Handles authentication state and operations for the Padeliz Manager app
 */

import { authService, AuthUser } from '@/services/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Check if user is authenticated
      const isAuthenticated = await authService.isAuthenticated();

      if (isAuthenticated) {
        // Get current user data
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } else {
        // Try to get stored user data for immediate UI display
        const storedUser = await authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
      }
    } catch (error) {
      console.error(
        '🔍 ManagerAuthProvider: Auth initialization error:',
        error
      );
      setError('Failed to initialize authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (googleToken: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const authResponse =
        await authService.authenticateWithGoogle(googleToken);

      setUser(authResponse.user);
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(
        error instanceof Error ? error.message : 'Google sign-in failed'
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Sign-out error:', error);
      setError(error instanceof Error ? error.message : 'Sign-out failed');
      // Clear user state even if server logout fails
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
    } catch (error) {
      console.error('Refresh user error:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to refresh user data'
      );
      // If refresh fails, user might be logged out
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
    signInWithGoogle,
    signOut,
    refreshUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
