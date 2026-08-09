/**
 * Resource Data Hook Types
 * Types for resource data hooks
 */

import { UtilSortConfig } from '../common/sorting';

export interface UseResourceDataOptions<T> {
  fetchData: (params: {
    page: number;
    perPage: number;
    search?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    filters?: Record<string, any>;
  }) => Promise<{ data: T[]; meta: any }>;
  initialPage?: number;
  initialPerPage?: number;
}

export interface UseResourceDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
  };
  search: {
    query: string;
    onSearch: (query: string) => void;
  };
  sorting: {
    config: UtilSortConfig;
    onSort: (key: string) => void;
  };
  bulkActions: {
    selectedItems: T[];
    onSelectAll: () => void;
    onSelectItem: (item: T) => void;
    onClearSelection: () => void;
    onBulkDelete: () => void;
  };
  refresh: () => void;
  setFilters: (filters: Record<string, any>) => void;
}
