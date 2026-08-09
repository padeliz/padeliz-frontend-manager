/**
 * Common Pagination Types
 * Shared pagination utilities and types
 */

export interface UtilPaginationInfo<T = any> {
  current_page: number;
  per_page: number;
  from: number;
  to: number;
  links: T;
  total: number;
  last_page: number;
  path: string;
}

export interface UtilAdvancedPaginationResponse<T> {
  data: T[];
  meta: UtilPaginationInfo;
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}
