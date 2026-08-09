/**
 * View Player Page
 * Display player details using ResourceViewPage
 */

import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayersApiService } from '@/services/api/playersApi';
import { ApiPlayer } from '@/types/api/entities';
import React, { useCallback } from 'react';

const playersApi = new PlayersApiService();

export default function ViewPlayerPage() {
  // Stable fetch functions using useCallback
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

  // Create resource view page configuration using the hook
  const config = useResourceViewPageConfig<ApiPlayer>({
    resourceName: 'Player',
    resourceDisplayName: 'Player',
    fetchResource,
    updateResource,
    title: 'Player Details',
    description: 'View and manage player information',
    excludeFields: ['password', 'internal_notes'], // Exclude sensitive fields
  });

  return <ResourceViewPage config={config} />;
}
