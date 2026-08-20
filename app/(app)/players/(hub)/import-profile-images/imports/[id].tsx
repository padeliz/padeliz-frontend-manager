import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayerProfileImageImportApiService } from '@/services/api/playerProfileImageImportApi';
import { ApiPlayerProfileImageImport } from '@/types/api/entities';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

const importsApi = new PlayerProfileImageImportApiService();

export default function PlayerProfileImageImportViewPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const importId = Number(params.id);
  const [chrome, setChrome] = useState<any>(null);

  const fetchResource = useCallback(async (id: string | number) => {
    return importsApi.getImport(Number(id));
  }, []);

  const config = useResourceViewPageConfig<ApiPlayerProfileImageImport>({
    resourceName: 'PlayerProfileImageImport',
    resourceDisplayName: 'Profile Image Import',
    fetchResource,
    embedded: true,
    showLinkedEntities: true,
    onChromeStateChange: setChrome,
    resourceIdOverride:
      importId && !Number.isNaN(importId) ? importId : null,
    title: 'Profile Image Import Details',
  });

  const actions = useMemo(
    () =>
      chrome
        ? {
            refresh: chrome.refresh,
            canSave: false,
            isDirty: false,
          }
        : null,
    [chrome]
  );
  useRegisterPageActions(actions);

  return (
    <View className="flex-1">
      <ResourceViewPage config={config} />
    </View>
  );
}
