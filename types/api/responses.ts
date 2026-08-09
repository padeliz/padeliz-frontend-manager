/**
 * API Response Types
 * Standard response formats from the backend API
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiPaginationInfo<T = any> {
  current_page: number;
  per_page: number;
  from: number;
  to: number;
  links: T;
  total: number;
  last_page: number;
  path: string;
}

export interface ApiPaginatedResponse<T = any> {
  data: T;
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: ApiPaginationInfo;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiBulkDeleteResponse {
  successful: any[];
  failed: any[];
  total_requested: number;
  total_successful: number;
  total_failed: number;
}
