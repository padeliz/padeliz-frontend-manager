/**
 * Common Sorting Types
 * Shared sorting utilities and types
 */

export interface UtilSortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface UtilMultiSortConfig {
  [field: string]: 'asc' | 'desc';
}
