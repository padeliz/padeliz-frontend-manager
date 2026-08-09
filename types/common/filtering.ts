/**
 * Common Filtering Types
 * Shared filtering utilities and types
 */

export interface UtilFilterConfig {
  field: string;
  value: any;
  operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
}

export interface UtilFilterOption {
  label: string;
  value: any;
  count?: number;
}

export interface UtilFilterDefinition {
  field: string;
  label: string;
  type: 'multiselect';
  options: UtilFilterOption[];
  placeholder?: string;
  multiple: true;
  width?: number;
}

export interface UtilSearchConfig {
  query: string;
  fields: string[];
  debounceMs?: number;
}
