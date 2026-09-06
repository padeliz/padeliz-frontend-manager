/**
 * Advanced Data Management Hook Types
 * Types for advanced data management hooks
 */

import { ApiResourceMetadata } from '../api/metadata';
import { ApiAdvancedPaginationParams } from '../api/requests';
import { UtilFilterDefinition } from '../common/filtering';
import { UtilAdvancedPaginationResponse } from '../common/pagination';
import { UtilMultiSortConfig } from '../common/sorting';
import { UiBulkActionConfig } from '../ui/tables';

export interface UseAdvancedDataManagementOptions<T> {
  fetchData: (
    params: ApiAdvancedPaginationParams
  ) => Promise<UtilAdvancedPaginationResponse<T>>;
  resourceName: string;
  bulkDelete?: (ids: (string | number)[]) => Promise<any>;
  bulkActions?: UiBulkActionConfig[];
  initialPage?: number;
  initialPerPage?: number;
  debounceMs?: number;
}

export interface UseAdvancedDataManagementReturn<T> {
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
    onBulkAction: (action: string) => Promise<void>;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
  };

  // Metadata
  metadata: ApiResourceMetadata | null;
  metadataLoading: boolean;

  // Actions
  refresh: () => Promise<void>;
  exportData: (format: 'csv' | 'json') => void;
}
