/**
 * Resource Configuration Hook Types
 * Types for resource configuration hooks
 */

import { UiBulkActionConfig, UiDataTableColumn } from '../ui/tables';

export interface HookResourcePageConfigOptions<
  T extends { [key: string]: any } = any,
> {
  // Resource identification
  resourceName: string;
  resourceDisplayName: string;

  // API service methods
  fetchData: (params: any) => Promise<{
    data: T[];
    meta: any;
    links: any;
  }>;
  bulkDelete?: (ids: (string | number)[]) => Promise<any>;

  // Table configuration
  excludeFields?: string[];
  staticColumns?: UiDataTableColumn<T>[];
  primaryKeyField?: string;

  // Page configuration
  title: string;
  description?: string;
  sectionLabel?: string;
  sectionHref?: string;
  emptyMessage?: string;

  // Action handlers
  onAdd?: () => void;
  onView?: (id: number) => void;
  onExport?: (format: string) => void;
  onBack?: () => void;

  // Pagination configuration
  initialPage?: number;
  initialPerPage?: number;
  debounceMs?: number;

  // Debug configuration
  showDebugInfo?: boolean;
  showInstructions?: boolean;

  // Bulk actions configuration
  enableBulkDelete?: boolean;
  enableBulkExport?: boolean;
  customBulkActions?: UiBulkActionConfig[];

  embedded?: boolean;
  mutationsDisabled?: boolean;
}

export interface HookResourceViewPageConfigOptions<
  T extends { [key: string]: any } = any,
> {
  // Resource identification
  resourceName: string;
  resourceDisplayName: string;

  // API methods
  fetchResource: (id: string | number) => Promise<{ data: T }>;
  updateResource?: (
    id: string | number,
    data: Partial<T>
  ) => Promise<{ data: T }>;


  // Display configuration
  excludeFields?: string[];

  // Page configuration
  title?: string;
  description?: string;
  sectionLabel?: string;
  sectionHref?: string;
  onBack?: () => void;

  // Debug configuration
  showDebugInfo?: boolean;
  showInstructions?: boolean;

  embedded?: boolean;
  resourceIdOverride?: number | null;
  showLinkedEntities?: boolean;
  excludeLinkedEntities?: string[];
  externalChrome?: boolean;
  showSave?: boolean;
  onChromeStateChange?: (state: any) => void;
}

export interface HookResourceCreatePageConfigOptions<
  T extends { [key: string]: any } = any,
> {
  resourceName: string;
  resourceDisplayName: string;
  createResource: (data: Partial<T>) => Promise<{ data: T }>;
  excludeFields?: string[];
  title?: string;
  description?: string;
  sectionLabel?: string;
  sectionHref?: string;
  onBack?: () => void;
  getViewPath?: (id: number, created: T) => string;
  seedFromQuery?: boolean | string[];
}
