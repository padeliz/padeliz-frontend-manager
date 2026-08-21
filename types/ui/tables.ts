/**
 * UI Table Types
 * Data table and related component types
 */

import { UtilFilterOption } from '../common/filtering';

export interface UiBulkActionConfig {
  label: string;
  action: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  confirmMessage?: string;
}

export interface UiDataTableColumn<T> {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'custom' | 'image';
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  width: number;
  render?: (item: T, index: number) => React.ReactNode;
  filterOptions?: UtilFilterOption[];
}

export interface UiDataTableConfig<T> {
  columns: UiDataTableColumn<T>[];
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  bulkActions?: UiBulkActionConfig[];
  pageSize?: number;
  pageSizeOptions?: number[];
}

export interface UiAdvancedDataTableProps<T> {
  data: T[];
  columns: UiDataTableColumn<T>[];
  primaryKeyField: string;
  loading?: boolean;
  error?: string | null;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
  };
  bulkActions?: {
    selectedItems: T[];
    onSelectAll: () => void;
    onSelectItem: (item: T) => void;
    onBulkAction: (action: string) => void;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
    availableActions: UiBulkActionConfig[];
  };
  sorting?: {
    config: Record<string, 'asc' | 'desc'>;
    onSort: (field: string) => void;
    onMultiSort: (field: string, direction: 'asc' | 'desc') => void;
  };
  emptyMessage?: string;
  className?: string;
}
