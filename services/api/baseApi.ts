/**
 * Base API Service
 * Provides common HTTP methods and authentication handling for all API services
 */

import { API_BASE_URL, API_MANAGER_PREFIX } from '@/utils/constants';
import { triggerBlobDownload } from '@/utils/downloadBlob';
import { storageUtils } from '@/utils/storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
    public code?: string
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
      let code: string | undefined;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errors = errorData.errors;
        code = typeof errorData.code === 'string' ? errorData.code : undefined;
      } catch {
        // If we can't parse the error response, use the default message
      }

      throw new ApiError(response.status, errorMessage, errors, code);
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

  /**
   * Generic Manager list fetch for FK dropdowns: GET /{resource_path}?…
   */
  async listResource<T = any>(endpoint: string): Promise<T> {
    return this.get<T>(endpoint);
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
   * Authenticated request that returns a Blob (no JSON parse).
   * Used for PDF downloads.
   */
  protected async requestBlob(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Blob> {
    const token = await this.getAuthToken();

    if (!token) {
      throw new ApiError(401, 'Authentication token not found');
    }

    const url = `${this.baseUrl}${this.managerPrefix}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf,application/octet-stream,*/*',
      ...(options.headers as Record<string, string> | undefined),
    };

    // Avoid forcing JSON content-type on blob/multipart requests
    if (
      options.body &&
      typeof options.body === 'string' &&
      !headers['Content-Type']
    ) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // ignore non-JSON error bodies
      }
      throw new ApiError(response.status, errorMessage);
    }

    return response.blob();
  }

  /**
   * Authenticated request that returns plain text (e.g. HTML preview).
   */
  protected async requestText(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<string> {
    const token = await this.getAuthToken();

    if (!token) {
      throw new ApiError(401, 'Authentication token not found');
    }

    const url = `${this.baseUrl}${this.managerPrefix}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'text/html,*/*',
      ...(options.headers as Record<string, string> | undefined),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // ignore non-JSON error bodies
      }
      throw new ApiError(response.status, errorMessage);
    }

    return response.text();
  }

  /**
   * Web-only helper: fetch a PDF blob and trigger a browser download via
   * object URL + temporary `<a download>`.
   */
  protected async downloadPdf(
    endpoint: string,
    filename: string,
    options: RequestInit = {}
  ): Promise<void> {
    if (typeof document === 'undefined') {
      throw new ApiError(
        501,
        'PDF download is only supported on web in the manager app'
      );
    }

    const blob = await this.requestBlob(endpoint, options);
    const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    triggerBlobDownload(blob, safeName);
  }

  /**
   * Web-only helper: fetch a blob and trigger a browser download with the given filename.
   */
  protected async downloadNamedFile(
    endpoint: string,
    filename: string,
    options: RequestInit = {}
  ): Promise<void> {
    if (typeof document === 'undefined') {
      throw new ApiError(
        501,
        'File download is only supported on web in the manager app'
      );
    }

    const blob = await this.requestBlob(endpoint, options);
    triggerBlobDownload(blob, filename);
  }

  /**
   * Authenticated multipart/form-data request (e.g. printed poster upload).
   */
  protected async requestFormData<T>(
    endpoint: string,
    formData: FormData,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    if (!token) {
      throw new ApiError(401, 'Authentication token not found');
    }

    const url = `${this.baseUrl}${this.managerPrefix}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(options.headers as Record<string, string> | undefined),
        // Let the runtime set multipart boundary — do not set Content-Type
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errors: Record<string, string[]> | undefined;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errors = errorData.errors;
      } catch {
        // ignore
      }
      throw new ApiError(response.status, errorMessage, errors);
    }

    try {
      return await response.json();
    } catch (error) {
      console.error('❌ BaseApiService: Failed to parse form response:', error);
      throw new ApiError(500, 'Failed to parse response');
    }
  }

  /** Public multipart POST for schema-driven ManagerFileUpload */
  async uploadFormData<T = any>(
    endpoint: string,
    formData: FormData
  ): Promise<T> {
    return this.requestFormData<T>(endpoint, formData);
  }

  /** Authenticated DELETE (no JSON body) for media/child deletes */
  async deleteUpload<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
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
