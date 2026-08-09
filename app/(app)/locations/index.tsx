/**
 * Locations Management Page
 * Complete locations resource management using the reusable system
 */

import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { LocationsApiService } from '@/services/api/locationsApi';
import { ApiLocation } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const locationsApi = new LocationsApiService();

export default function LocationsPage() {
  const router = useRouter();

  // Columns will be generated dynamically from metadata

  // Stable fetch functions using useCallback
  const fetchData = useCallback(async (params: any) => {
    const response = await locationsApi.getLocations(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    const response = await locationsApi.bulkDeleteLocations(ids as number[]);
    return response;
  }, []);

  // Action handlers
  const handleAddLocation = useCallback(() => {
    router.push('/locations/add' as any);
  }, [router]);

  const handleViewLocation = useCallback(
    (locationId: number) => {
      router.push(`/locations/${locationId}` as any);
    },
    [router]
  );

  const handleExportAll = useCallback((format: string) => {
    // Custom export logic can be implemented here
  }, []);

  // Create resource page configuration using the hook
  const config = useResourcePageConfig<ApiLocation>({
    resourceName: 'Location',
    resourceDisplayName: 'Location',
    fetchData,
    bulkDelete,
    title: 'Locations Management',
    description:
      'Manage padel locations with advanced search, filters, and bulk operations',
    onAdd: handleAddLocation,
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
