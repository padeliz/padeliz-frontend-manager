/**
 * API Error Types
 * API-related error handling types
 */

export interface ErrorApi {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}
