/**
 * Page Component Types
 * Types for page components
 */

import type { ResourceSubHeaderProps } from '@/components/pages/ResourceSubHeader';
import { UiBulkActionConfig, UiDataTableColumn } from './tables';

/** Optional in-body sub-header strip (below Page Header). */
export type ResourcePageSubHeaderConfig = Pick<
  ResourceSubHeaderProps,
  'title' | 'description' | 'actions'
>;

export interface ResourceListPageConfig<
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
  /** When metadata is unavailable, use these columns instead. */
  staticColumns?: UiDataTableColumn<T>[];
  /** Primary key field when using staticColumns (defaults to id). */
  primaryKeyField?: string;

  // Bulk actions configuration
  bulkActions?: UiBulkActionConfig[];

  // Page configuration
  title: string;
  description?: string;
  /** Breadcrumb section label (defaults to title). */
  sectionLabel?: string;
  /** Breadcrumb section href for add/view leaves (defaults to '/'). */
  sectionHref?: string;
  /** Optional sub-header strip below Page Header. */
  subHeader?: ResourcePageSubHeaderConfig | null;
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

  /** Omit AppLayout and the back-arrow header (keep the inner action row). */
  embedded?: boolean;
  /**
   * Add stays visible but non-pressable. After rows are selected, Delete Selected
   * stays visible but non-pressable. Export / View / search / Refresh stay enabled.
   */
  mutationsDisabled?: boolean;
}

export interface ResourceListPageProps<T extends { [key: string]: any } = any> {
  config: ResourceListPageConfig<T>;
}

export interface LinkedEntityConfig {
  key: string;
  label: string;
  resourceName: string;
  fetchData: (parentId: number, params: any) => Promise<any>;
  columns?: any[];
  excludeFields?: string[];
  selectedColumns?: string[];
}

export interface ResourceViewPageConfig<
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
  subHeader?: ResourcePageSubHeaderConfig | null;
  onBack?: () => void;

  /** When true, omit AppLayout (e.g. Editions Details tab) */
  embedded?: boolean;
  /** Query param id override when not using route [id] */
  resourceIdOverride?: number | null;
  /** Show linked entities even when embedded (default: !embedded) */
  showLinkedEntities?: boolean;
  /** Linked entity keys to hide, e.g. editions own `divisions` in their own tab */
  excludeLinkedEntities?: string[];
  /**
   * Parent owns Save/Refresh via onChromeStateChange.
   * Still renders in-page Edit/Cancel (Save hidden via showSave=false).
   */
  externalChrome?: boolean;
  /** When false, EditModeToggle omits Save. Default true. */
  showSave?: boolean;
  onChromeStateChange?: (state: {
    save: () => Promise<void>;
    refresh: () => Promise<void>;
    edit?: () => void;
    cancel?: () => void;
    isEditing: boolean;
    isSaving: boolean;
    canSave: boolean;
    isDirty: boolean;
    displayTitle?: string;
  }) => void;
}

export interface ResourceViewPageProps<T extends { [key: string]: any } = any> {
  config: ResourceViewPageConfig<T>;
}

export interface ResourceCreatePageConfig<
  T extends { [key: string]: any } = any,
> {
  resourceName: string;
  resourceDisplayName: string;
  createResource: (data: Partial<T>) => Promise<{ data: T }>;
  excludeFields?: string[];
  title: string;
  description?: string;
  sectionLabel?: string;
  sectionHref?: string;
  subHeader?: ResourcePageSubHeaderConfig | null;
  onBack?: () => void;
  /** Path after successful create (default: list-style /{resource}/{id}) */
  getViewPath?: (id: number, created: T) => string;
  /**
   * Seed writable schema fields from the URL query after metadata loads.
   * `true` = any writable field; `string[]` = those keys only.
   */
  seedFromQuery?: boolean | string[];
}

export interface ResourceCreatePageProps<
  T extends { [key: string]: any } = any,
> {
  config: ResourceCreatePageConfig<T>;
}

