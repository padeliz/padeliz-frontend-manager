/**
 * Hook for creating resource create-page configurations
 */

import { HookResourceCreatePageConfigOptions } from '@/types/hooks/resource-config';
import { useMemo } from 'react';

export function useResourceCreatePageConfig<
  T extends { [key: string]: any } = any,
>({
  resourceName,
  resourceDisplayName,
  createResource,
  excludeFields = [],
  title,
  description,
  sectionLabel,
  sectionHref,
  onBack,
  getViewPath,
  seedFromQuery,
}: HookResourceCreatePageConfigOptions<T>) {
  const defaultTitle = useMemo(
    () => title || `Add ${resourceDisplayName}`,
    [title, resourceDisplayName]
  );

  const defaultDescription = useMemo(
    () =>
      description || `Create a new ${resourceDisplayName.toLowerCase()}`,
    [description, resourceDisplayName]
  );

  return useMemo(
    () => ({
      resourceName,
      resourceDisplayName,
      createResource,
      excludeFields,
      title: defaultTitle,
      description: defaultDescription,
      sectionLabel,
      sectionHref,
      onBack,
      getViewPath,
      seedFromQuery,
    }),
    [
      resourceName,
      resourceDisplayName,
      createResource,
      excludeFields,
      defaultTitle,
      defaultDescription,
      sectionLabel,
      sectionHref,
      onBack,
      getViewPath,
      seedFromQuery,
    ]
  );
}
