/**
 * Hook for creating resource page configurations
 * Provides utilities for common resource page setups
 */

import { HookResourcePageConfigOptions } from '@/types/hooks/resource-config';
import { UiBulkActionConfig } from '@/types/ui/tables';
import { useMemo } from 'react';

export function useResourcePageConfig<T extends { [key: string]: any } = any>({
  resourceName,
  resourceDisplayName,
  fetchData,
  bulkDelete,
  excludeFields = [],
  excludeFilterFields = [],
  extraListParams,
  staticColumns,
  primaryKeyField,
  title,
  description,
  sectionLabel,
  sectionHref,
  emptyMessage,
  onAdd,
  onView,
  onExport,
  onBack,
  initialPage = 1,
  initialPerPage = 10,
  debounceMs = 300,
  showDebugInfo = false,
  showInstructions = false,
  enableBulkDelete = true,
  enableBulkExport = true,
  customBulkActions = [],
  embedded = false,
  mutationsDisabled = false,
}: HookResourcePageConfigOptions<T>) {
  // Generate default bulk actions based on configuration
  const bulkActions = useMemo(() => {
    const actions: UiBulkActionConfig[] = [];

    // Add custom bulk actions first
    actions.push(...customBulkActions);

    // Add default bulk actions if enabled
    if (enableBulkDelete && bulkDelete) {
      actions.push({
        label: 'Delete Selected',
        action: 'delete',
        icon: 'trash',
        variant: 'danger',
        confirmMessage: `Are you sure you want to delete the selected ${resourceDisplayName.toLowerCase()}?`,
      });
    }

    if (enableBulkExport) {
      actions.push({
        label: 'Export Selected',
        action: 'export',
        icon: 'download',
        variant: 'primary',
      });
    }

    return actions;
  }, [
    customBulkActions,
    enableBulkDelete,
    enableBulkExport,
    bulkDelete,
    resourceDisplayName,
  ]);

  // Generate default empty message if not provided
  const defaultEmptyMessage = useMemo(() => {
    if (emptyMessage) return emptyMessage;
    return `No ${resourceDisplayName.toLowerCase()} found. Try adjusting your search or filters.`;
  }, [emptyMessage, resourceDisplayName]);

  // Return the complete configuration
  return useMemo(
    () => ({
      resourceName,
      resourceDisplayName,
      fetchData,
      bulkDelete,
      excludeFields,
      excludeFilterFields,
      extraListParams,
      staticColumns,
      primaryKeyField,
      bulkActions,
      title,
      description,
      sectionLabel,
      sectionHref,
      emptyMessage: defaultEmptyMessage,
      onAdd,
      onView,
      onExport,
      onBack,
      initialPage,
      initialPerPage,
      debounceMs,
      showDebugInfo,
      showInstructions,
      embedded,
      mutationsDisabled,
    }),
    [
      resourceName,
      resourceDisplayName,
      fetchData,
      bulkDelete,
      excludeFields,
      excludeFilterFields,
      extraListParams,
      staticColumns,
      primaryKeyField,
      bulkActions,
      title,
      description,
      sectionLabel,
      sectionHref,
      defaultEmptyMessage,
      onAdd,
      onView,
      onExport,
      onBack,
      initialPage,
      initialPerPage,
      debounceMs,
      showDebugInfo,
      showInstructions,
      embedded,
      mutationsDisabled,
    ]
  );
}
