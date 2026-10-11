/**
 * Authentication Service
 * Handles Google OAuth authentication and JWT token management
 */

import { ApiAuthUser, ApiLoginResponse } from '@/types/api/auth';
import { storageUtils } from '@/utils/storage';
import { BaseApiService } from './api/baseApi';

export class AuthService extends BaseApiService {
  private readonly USER_STORAGE_KEY = 'auth_user';
  private readonly TOKEN_STORAGE_KEY = 'auth_token';

  constructor() {
    super();
  }

  /**
   * Authenticate with Google OAuth token
   */
  async authenticateWithGoogle(
    googleToken: string
  ): Promise<{ token: string; user: ApiAuthUser }> {
    try {
      const response = await this.unauthenticatedPost<{
        data: ApiLoginResponse;
      }>('/auth/google', {
        id_token: googleToken,
      });

      if (response.data) {
      }

      // Store the JWT token
      await this.setAuthToken(response.data.token);

      const authUser = response.data.user;
      await this.storeUser(authUser);

      return {
        token: response.data.token,
        user: authUser,
      };
    } catch (error) {
      console.error('❌ AuthService: Google authentication failed:', error);

      // Clear any partial data on failure
      await this.clearStoredData();

      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiAuthUser> {
    try {
      const response = await this.get<{ data: ApiAuthUser }>('/auth/me');
      return response.data;
    } catch (error) {
      console.error('❌ AuthService: Failed to get current user:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getStoredToken();

      // Only check if token exists, don't validate it here
      const isAuth = !!token;
      return isAuth;
    } catch (error) {
      console.error('❌ AuthService: Authentication check failed:', error);
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Call logout endpoint
      await this.post('/auth/logout');
    } catch (error) {
      console.error('❌ AuthService: Logout request failed:', error);
      // Continue with local cleanup even if server request fails
    } finally {
      // Clear local storage
      await this.clearStoredData();
    }
  }

  /**
   * Get stored user data
   */
  async getStoredUser(): Promise<ApiAuthUser | null> {
    try {
      const user = await storageUtils.get<ApiAuthUser>(this.USER_STORAGE_KEY);
      return user;
    } catch (error) {
      console.error('❌ AuthService: Failed to get stored user:', error);
      return null;
    }
  }

  /**
   * Store user data locally
   */
  private async storeUser(user: ApiAuthUser): Promise<void> {
    try {
      await storageUtils.set(this.USER_STORAGE_KEY, user);
    } catch (error) {
      console.error('❌ AuthService: Failed to store user data:', error);
    }
  }

  /**
   * Get stored JWT token
   */
  private async getStoredToken(): Promise<string | null> {
    try {
      const token = await storageUtils.get<string>(this.TOKEN_STORAGE_KEY);
      return token;
    } catch (error) {
      console.error('❌ AuthService: Failed to get stored token:', error);
      return null;
    }
  }

  /**
   * Store JWT token locally
   */
  protected async setAuthToken(token: string): Promise<void> {
    try {
      await storageUtils.set(this.TOKEN_STORAGE_KEY, token);
    } catch (error) {
      console.error('❌ AuthService: Failed to store auth token:', error);
    }
  }

  /**
   * Clear all stored authentication data
   */
  private async clearStoredData(): Promise<void> {
    try {
      await storageUtils.remove(this.USER_STORAGE_KEY);
      await storageUtils.remove(this.TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('❌ AuthService: Failed to clear stored data:', error);
    }
  }

  /**
   * Refresh user data
   */
  async refreshUser(): Promise<ApiAuthUser> {
    try {
      const user = await this.getCurrentUser();
      await this.storeUser(user);
      return user;
    } catch (error) {
      console.error('❌ AuthService: Failed to refresh user:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
