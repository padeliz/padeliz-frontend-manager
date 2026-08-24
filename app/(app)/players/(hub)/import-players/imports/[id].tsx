import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayerImportApiService } from '@/services/api/playerImportApi';
import { ApiPlayerImport } from '@/types/api/entities';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

const importsApi = new PlayerImportApiService();

export default function PlayerImportViewPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const importId = Number(params.id);
  const [chrome, setChrome] = useState<any>(null);

  const fetchResource = useCallback(async (id: string | number) => {
    return importsApi.getImport(Number(id));
  }, []);

  const config = useResourceViewPageConfig<ApiPlayerImport>({
    resourceName: 'PlayerImport',
    resourceDisplayName: 'Import',
    fetchResource,
    embedded: true,
    showLinkedEntities: true,
    onChromeStateChange: setChrome,
    resourceIdOverride:
      importId && !Number.isNaN(importId) ? importId : null,
    title: 'Import Details',
  });

  const actions = useMemo(
    () =>
      chrome
        ? {
            refresh: chrome.refresh,
            canSave: false,
            isDirty: false,
            displayTitle: chrome.displayTitle,
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
