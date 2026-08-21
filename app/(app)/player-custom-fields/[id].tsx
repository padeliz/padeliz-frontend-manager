import AppLayout from '@/components/layout/AppLayout';
import PlayerCustomFieldOptionsPanel from '@/components/playerCustomFields/PlayerCustomFieldOptionsPanel';
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useToast } from '@/context/ToastContext';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayerCustomFieldsApiService } from '@/services/api/playerCustomFieldsApi';
import { ApiPlayerCustomField } from '@/types/api/entities';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const api = new PlayerCustomFieldsApiService();

export default function ViewPlayerCustomFieldPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const fieldId = Number(params.id);
  const { showSuccess, showError } = useToast();
  const [field, setField] = useState<ApiPlayerCustomField | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [archiving, setArchiving] = useState(false);

  const fetchResource = useCallback(
    async (id: string | number) => {
      const response = await api.getPlayerCustomField(Number(id));
      setField(response.data);
      return response;
    },
    [refreshToken]
  );

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiPlayerCustomField>) => {
      const response = await api.updatePlayerCustomField(Number(id), data);
      setField(response.data);
      return response;
    },
    []
  );

  const config = useResourceViewPageConfig<ApiPlayerCustomField>({
    resourceName: 'PlayerCustomField',
    resourceDisplayName: 'Custom Field',
    fetchResource,
    updateResource,
    excludeFields: ['rules_json', 'type', 'code', 'archived_at', 'options'],
    title: 'Custom Field Details',
    resourceIdOverride:
      fieldId && !Number.isNaN(fieldId) ? fieldId : null,
    showLinkedEntities: false,
    embedded: true,
  });

  const isSelect = useMemo(
    () => field?.type === 'single_select' || field?.type === 'multi_select',
    [field?.type]
  );

  const refresh = () => setRefreshToken(token => token + 1);

  const onArchiveToggle = async () => {
    if (!fieldId || Number.isNaN(fieldId)) return;
    setArchiving(true);
    try {
      if (field?.archived_at != null) {
        const response = await api.unarchivePlayerCustomField(fieldId);
        setField(response.data);
        showSuccess('Unarchived', 'Custom field is active again');
      } else {
        const response = await api.archivePlayerCustomField(fieldId);
        setField(response.data);
        showSuccess('Archived', 'Custom field archived');
      }
      refresh();
    } catch (err: any) {
      showError('Update failed', err?.message || 'Could not update archive state');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <AppLayout title="Custom Field">
      <View className="flex-1">
        <View className="flex-row items-center p-4 border-b border-gray-200">
          <Pressable
            testID="player-custom-field-back"
            onPress={() => router.push('/player-custom-fields' as any)}
            className="mr-3 p-2"
          >
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              Custom Field #{fieldId}
            </Text>
          </View>
          <Pressable
            testID="player-custom-field-archive-toggle"
            disabled={archiving}
            onPress={() => void onArchiveToggle()}
            className={`rounded-lg px-3 py-2 ${
              field?.archived_at != null ? 'bg-green-600' : 'bg-amber-600'
            }`}
          >
            <Text className="text-white text-sm font-medium">
              {field?.archived_at != null ? 'Unarchive' : 'Archive'}
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1">
          <ResourceViewPage config={config} />
          {isSelect && fieldId && !Number.isNaN(fieldId) ? (
            <PlayerCustomFieldOptionsPanel fieldId={fieldId} />
          ) : null}
        </ScrollView>
      </View>
    </AppLayout>
  );
}
