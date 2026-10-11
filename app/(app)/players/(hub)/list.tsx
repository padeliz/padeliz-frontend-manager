/**
 * Players list (hub tab).
 */

import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayersApiService } from '@/services/api/playersApi';
import { ApiPlayer } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const playersApi = new PlayersApiService();

export default function PlayersListPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await playersApi.getPlayers(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return playersApi.bulkDeletePlayers(ids as number[]);
  }, []);

  const handleAddPlayer = useCallback(() => {
    router.push('/players/add' as any);
  }, [router]);

  const handleViewPlayer = useCallback(
    (playerId: number) => {
      router.push(`/players/${playerId}/details` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayer>({
    resourceName: 'User',
    resourceDisplayName: 'Player',
    fetchData,
    bulkDelete,
    excludeFields: ['first_name', 'middle_name', 'last_name'],
    title: 'Players',
    description:
      'Manage padel players with advanced search, filters, and bulk operations',
    onAdd: handleAddPlayer,
    onView: handleViewPlayer,
    initialPage: 1,
    initialPerPage: 10,
    debounceMs: 300,
    showDebugInfo: false,
    showInstructions: false,
    enableBulkDelete: true,
    enableBulkExport: true,
    embedded: true,
  });

  return <ResourceListPage config={config} />;
}
