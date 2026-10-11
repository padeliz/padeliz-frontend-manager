/**
 * View Player Page — Details tab
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayersApiService } from '@/services/api/playersApi';
import { ApiPlayer } from '@/types/api/entities';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';

const playersApi = new PlayersApiService();

export default function ViewPlayerDetailsPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const playerId = Number(params.id);
  const [chrome, setChrome] = useState<any>(null);

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
    resourceName: 'User',
    resourceDisplayName: 'Player',
    fetchResource,
    updateResource,
    embedded: true,
    showLinkedEntities: true,
    externalChrome: true,
    showSave: false,
    onChromeStateChange: setChrome,
    title: 'Player Details',
    description: 'View and manage player information',
    excludeFields: ['password', 'internal_notes'],
    resourceIdOverride:
      playerId && !Number.isNaN(playerId) ? playerId : null,
  } as any);

  const actions = useMemo(
    () =>
      chrome
        ? {
            save: chrome.save,
            refresh: chrome.refresh,
            edit: chrome.edit,
            cancel: chrome.cancel,
            isEditing: chrome.isEditing,
            isSaving: chrome.isSaving,
            canSave: chrome.canSave,
            isDirty: chrome.isDirty,
            displayTitle: chrome.displayTitle,
          }
        : null,
    [chrome]
  );
  useRegisterPageActions(actions);

  return <ResourceViewPage config={config} />;
}
