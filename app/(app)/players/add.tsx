import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { PlayersApiService } from '@/services/api/playersApi';
import { ApiPlayer } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PlayersApiService();

export default function AddPlayerPage() {
  const createResource = useCallback(async (data: Partial<ApiPlayer>) => {
    return api.createPlayer(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiPlayer>({
    resourceName: 'User',
    resourceDisplayName: 'Player',
    createResource,
    excludeFields: ['password', 'internal_notes'],
    sectionLabel: 'Players',
    sectionHref: '/players',
    getViewPath: id => '/players/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
