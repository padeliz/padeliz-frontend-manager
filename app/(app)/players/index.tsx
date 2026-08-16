/**
 * Players Management Page
 * Complete players resource management using the reusable system
 */

import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayersApiService } from '@/services/api/playersApi';
import { ApiPlayer } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const playersApi = new PlayersApiService();

export default function PlayersPage() {
  const router = useRouter();

  // Columns will be generated dynamically from metadata

  // Stable fetch functions using useCallback
  const fetchData = useCallback(async (params: any) => {
    const response = await playersApi.getPlayers(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    const response = await playersApi.bulkDeletePlayers(ids as number[]);
    return response;
  }, []);

  // Action handlers
  const handleAddPlayer = useCallback(() => {
    router.push('/players/add' as any);
  }, [router]);

  const handleViewPlayer = useCallback(
    (playerId: number) => {
      router.push(`/players/${playerId}` as any);
    },
    [router]
  );

  const handleExportAll = useCallback((format: string) => {
    // Custom export logic can be implemented here
  }, []);

  // Create resource page configuration using the hook
  const config = useResourcePageConfig<ApiPlayer>({
    resourceName: 'Player',
    resourceDisplayName: 'Player',
    fetchData,
    bulkDelete,
    excludeFields: ['first_name', 'middle_name', 'last_name'],
    title: 'Players Management',
    description:
      'Manage padel players with advanced search, filters, and bulk operations',
    onAdd: handleAddPlayer,
    onView: handleViewPlayer,
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
