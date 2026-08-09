/**
 * Authentication Context Types
 * Types for authentication context and state management
 */

import { ApiAuthUser } from '../api/auth';

export interface ContextAuth {
  user: ApiAuthUser | null;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: (googleToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export interface ContextAuthProviderProps {
  children: React.ReactNode;
}
