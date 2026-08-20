/**
 * View Player Page — Details tab
 */

import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayersApiService } from '@/services/api/playersApi';
import { ApiPlayer } from '@/types/api/entities';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';

const playersApi = new PlayersApiService();

export default function ViewPlayerDetailsPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const playerId = Number(params.id);

  const fetchResource = useCallback(async (id: string | number) => {
    const response = await playersApi.getPlayer(Number(id));
    return response;
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiPlayer>) => {
      const response = await playersApi.updatePlayer(Number(id), data);
      return response;
    },
    []
  );

  const config = useResourceViewPageConfig<ApiPlayer>({
    resourceName: 'Player',
    resourceDisplayName: 'Player',
    fetchResource,
    updateResource,
    embedded: true,
    showLinkedEntities: true,
    title: 'Player Details',
    description: 'View and manage player information',
    excludeFields: ['password', 'internal_notes'],
    resourceIdOverride:
      playerId && !Number.isNaN(playerId) ? playerId : null,
  });

  return <ResourceViewPage config={config} />;
}
