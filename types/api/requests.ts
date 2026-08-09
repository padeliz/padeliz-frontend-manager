/**
 * API Request Types
 * Request parameters and data for API calls
 */

export interface ApiAdvancedPaginationParams {
  page: number;
  per_page: number;
  q?: string;
  filters?: Record<string, any>;
  sort_by?: Record<string, 'asc' | 'desc'>;
}
