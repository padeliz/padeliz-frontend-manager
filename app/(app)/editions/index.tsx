/**
 * Editions Management Page
 * Complete editions resource management using the reusable system
 */

import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EditionsApiService } from '@/services/api/editionsApi';
import { ApiEdition } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const editionsApi = new EditionsApiService();

export default function EditionsPage() {
  const router = useRouter();

  // Columns will be generated dynamically from metadata

  // Stable fetch functions using useCallback
  const fetchData = useCallback(async (params: any) => {
    const response = await editionsApi.getEditions(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    const response = await editionsApi.bulkDeleteEditions(ids as number[]);
    return response;
  }, []);

  // Action handlers
  const handleAddEdition = useCallback(() => {
    router.push('/editions/add');
  }, [router]);

  const handleViewEdition = useCallback(
    (editionId: number) => {
      router.push(`/editions/${editionId}`);
    },
    [router]
  );

  const handleExportAll = useCallback((format: string) => {
    // Custom export logic can be implemented here
  }, []);

  // Create resource page configuration using the hook
  const config = useResourcePageConfig<ApiEdition>({
    resourceName: 'Edition',
    resourceDisplayName: 'Edition',
    sectionLabel: 'Editions',
    sectionHref: '/editions',
    fetchData,
    bulkDelete,
    title: 'Editions',
    description:
      'Manage padel editions with advanced search, filters, and bulk operations',
    onAdd: handleAddEdition,
    onView: handleViewEdition,
    onExport: handleExportAll,
    initialPage: 1,
    initialPerPage: 10,
    debounceMs: 300,
    showDebugInfo: false,
    showInstructions: false,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
