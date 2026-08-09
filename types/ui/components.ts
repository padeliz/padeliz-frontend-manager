/**
 * UI Component Types
 * General UI component prop types
 */

export type UiToastType = 'success' | 'error' | 'warning' | 'info';

export interface UiToastProps {
  id: string;
  type: UiToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
  onPress?: () => void;
}

export interface UiToastContainerProps {
  toasts: UiToastProps[];
  onRemoveToast: (id: string) => void;
}

export interface UiLoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

export interface UiAdvancedSearchFiltersProps {
  searchQuery: string;
  searchInput: string;
  searchPlaceholder: string;
  onInputChange: (input: string) => void;
  onSearch: () => void;
  onKeyPress: (event: any) => void;
  onBlur: () => void;
  onClear: () => void;
  activeFilters: Record<string, any>;
  filterDefinitions: any[];
  onFilter: (field: string, value: any) => void;
}
