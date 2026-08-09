/**
 * Base API Service
 * Provides common HTTP methods and authentication handling for all API services
 */

import { API_BASE_URL, API_MANAGER_PREFIX } from '@/utils/constants';
import { storageUtils } from '@/utils/storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class BaseApiService {
  private baseUrl: string;
  private managerPrefix: string;

  constructor() {
    this.baseUrl = API_BASE_URL || 'http://localhost:8000';
    this.managerPrefix = API_MANAGER_PREFIX || '/api/v1/manager';
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    if (!token) {
      console.error(
        '❌ BaseApiService: No auth token found for authenticated request'
      );
      throw new ApiError(401, 'Authentication token not found');
    }

    const url = `${this.baseUrl}${this.managerPrefix}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errors: Record<string, string[]> | undefined;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errors = errorData.errors;
      } catch {
        // If we can't parse the error response, use the default message
      }

      throw new ApiError(response.status, errorMessage, errors);
    }

    try {
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ BaseApiService: Failed to parse response:', error);
      throw new ApiError(500, 'Failed to parse response');
    }
  }

  protected async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  protected async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  protected async bulkDelete<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  /**
   * Make an unauthenticated request (for auth endpoints)
   */
  protected async unauthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${this.managerPrefix}${endpoint}`;
    // console.log('📤 BaseApiService: Request options:', {
    //   method: options.method,
    //   body: options.body,
    //   headers: options.headers,
    // });

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    // console.log(
    //   '📥 BaseApiService: Response status:',
    //   response.status,
    //   response.statusText
    // );
    // console.log(
    //   '🔍 BaseApiService: Response headers:',
    //   Object.fromEntries(response.headers.entries())
    // );

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errors: Record<string, string[]> | undefined;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errors = errorData.errors;
      } catch {
        // If we can't parse the error response, use the default message
      }

      throw new ApiError(response.status, errorMessage, errors);
    }

    try {
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ BaseApiService: Failed to parse response:', error);
      throw new ApiError(500, 'Failed to parse response');
    }
  }

  /**
   * Unauthenticated POST method (for auth endpoints)
   */
  protected async unauthenticatedPost<T>(
    endpoint: string,
    data?: any
  ): Promise<T> {
    return this.unauthenticatedRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await storageUtils.get<string>('auth_token');
      // console.log(
      //   '🔍 BaseApiService: getAuthToken result:',
      //   token ? 'TOKEN_FOUND' : 'NO_TOKEN'
      // );
      return token;
    } catch (error) {
      console.error('❌ BaseApiService: Failed to get auth token:', error);
      return null;
    }
  }

  protected async setAuthToken(token: string): Promise<void> {
    try {
      await storageUtils.set('auth_token', token);
    } catch (error) {
      console.error('❌ BaseApiService: Failed to set auth token:', error);
    }
  }

  protected async clearAuthToken(): Promise<void> {
    try {
      await storageUtils.remove('auth_token');
    } catch (error) {
      console.error('❌ BaseApiService: Failed to clear auth token:', error);
    }
  }
}
