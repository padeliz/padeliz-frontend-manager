/**
 * Data Management Hook Types
 * Types for data management hooks
 */

import { ApiResourceMetadata } from '../api/metadata';
import { UtilFilterDefinition } from '../common/filtering';
import { UtilMultiSortConfig } from '../common/sorting';
import { UiBulkActionConfig } from '../ui/tables';

export interface HookDataManagementOptions<T> {
  fetchData: (params: any) => Promise<{ data: T[]; meta: any; links: any }>;
  fetchMetadata: () => Promise<{ data: ApiResourceMetadata }>;
  bulkDelete?: (ids: (string | number)[]) => Promise<any>;
  bulkActions?: UiBulkActionConfig[];
  initialPage?: number;
  initialPerPage?: number;
  debounceMs?: number;
}

export interface HookDataManagementReturn<T> {
  // Data
  data: T[];
  loading: boolean;
  error: string | null;

  // Pagination
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
  };

  // Search
  search: {
    query: string;
    input: string;
    placeholder: string;
    onInputChange: (input: string) => void;
    onSearch: () => void;
    onKeyPress: (event: any) => void;
    onBlur: () => void;
    onClear: () => void;
  };

  // Sorting
  sorting: {
    config: UtilMultiSortConfig;
    onSort: (field: string) => void;
    onMultiSort: (field: string, direction: 'asc' | 'desc') => void;
  };

  // Filtering
  filters: {
    active: Record<string, any>;
    definitions: UtilFilterDefinition[];
    onFilter: (field: string, value: any) => void;
  };

  // Reset
  reset: {
    hasActiveState: boolean;
    onReset: () => void;
  };

  // Bulk Actions
  bulkActions: {
    selectedItems: T[];
    onSelectAll: () => void;
    onSelectItem: (item: T) => void;
    onClearSelection: () => void;
    onBulkAction: (action: string) => void;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
  };

  // Metadata
  metadata: ApiResourceMetadata | null;
  metadataLoading: boolean;

  // Actions
  refresh: () => void;
  exportData: (format: 'csv' | 'json') => void;
}
