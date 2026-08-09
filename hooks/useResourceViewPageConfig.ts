/**
 * Hook for creating resource view page configurations
 * Provides utilities for common resource view page setups
 */

import { HookResourceViewPageConfigOptions } from '@/types/hooks/resource-config';
import { useMemo } from 'react';

export function useResourceViewPageConfig<T extends { [key: string]: any } = any>({
  resourceName,
  resourceDisplayName,
  fetchResource,
  updateResource,
  excludeFields = [],
  title,
  description,
  onBack,
  showDebugInfo = false,
  showInstructions = false,
}: HookResourceViewPageConfigOptions<T>) {
  // Generate default description if not provided
  const defaultDescription = useMemo(() => {
    if (description) return description;
    return `View and manage ${resourceDisplayName.toLowerCase()} information`;
  }, [description, resourceDisplayName]);

  // Generate default title if not provided
  const defaultTitle = useMemo(() => {
    if (title) return title;
    return `${resourceDisplayName} Details`;
  }, [title, resourceDisplayName]);

  // Generate default exclude fields for common sensitive fields
  const defaultExcludeFields = useMemo(() => {
    const commonSensitiveFields = [
      'password',
      'internal_notes',
      'created_at',
      'updated_at',
    ];
    const userExcludedFields = excludeFields || [];

    // Combine user-specified exclusions with common sensitive fields
    return [...new Set([...commonSensitiveFields, ...userExcludedFields])];
  }, [excludeFields]);

  // Return the complete configuration
  return useMemo(
    () => ({
      resourceName,
      resourceDisplayName,
      fetchResource,
      updateResource,
      excludeFields: defaultExcludeFields,
      title: defaultTitle,
      description: defaultDescription,
      onBack,
      showDebugInfo,
      showInstructions,
    }),
    [
      resourceName,
      resourceDisplayName,
      fetchResource,
      updateResource,
      defaultExcludeFields,
      defaultTitle,
      defaultDescription,
      onBack,
      showDebugInfo,
      showInstructions,
    ]
  );
}
