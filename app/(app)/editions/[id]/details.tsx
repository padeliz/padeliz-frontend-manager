/**
 * Edition Details tab
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EditionsApiService } from '@/services/api/editionsApi';
import { ApiEdition } from '@/types/api/entities';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

const editionsApi = new EditionsApiService();

export default function EditionDetailsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const editionId = Number(params.id);
  const [chrome, setChrome] = useState<any>(null);

  const fetchResource = useCallback(async (id: string | number) => {
    return editionsApi.getEdition(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEdition>) => {
      return editionsApi.updateEdition(Number(id), data);
    },
    []
  );

  const detailsConfig = useResourceViewPageConfig<ApiEdition>({
    resourceName: 'Edition',
    resourceDisplayName: 'Edition',
    fetchResource,
    updateResource,
    embedded: true,
    showLinkedEntities: true,
    externalChrome: true,
    showSave: false,
    onChromeStateChange: setChrome,
    resourceIdOverride:
      editionId && !Number.isNaN(editionId) ? editionId : null,
    title: 'Edition Details',
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
          }
        : null,
    [chrome]
  );
  useRegisterPageActions(actions);

  return (
    <View className="p-4">
      <ResourceViewPage config={detailsConfig} />
    </View>
  );
}
