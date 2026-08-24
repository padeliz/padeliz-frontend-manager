/**
 * Custom field detail — hybrid AppLayout + embedded ResourceViewPage.
 */

import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import EditModeToggle from '@/components/pages/EditModeToggle';
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import PlayerCustomFieldOptionsPanel from '@/components/playerCustomFields/PlayerCustomFieldOptionsPanel';
import HeaderActionButton from '@/components/ui/HeaderActionButton';
import { useToast } from '@/context/ToastContext';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayerCustomFieldsApiService } from '@/services/api/playerCustomFieldsApi';
import { ApiPlayerCustomField } from '@/types/api/entities';
import { getResourceDisplayLabel, formatResourceHeaderTitle } from '@/utils/getResourceDisplayLabel';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

const api = new PlayerCustomFieldsApiService();

function CustomFieldChrome({
  fieldId,
  field,
  archiving,
  onArchiveToggle,
  children,
}: {
  fieldId: number;
  field: ApiPlayerCustomField | null;
  archiving: boolean;
  onArchiveToggle: () => void;
  children: React.ReactNode;
}) {
  const { actions } = usePageChrome();
  const { getMetadata } = useResourceMetadata(['PlayerCustomField']);
  const metadata = getMetadata('PlayerCustomField');

  const displayLabel =
    actions?.displayTitle ||
    getResourceDisplayLabel(metadata, field, fieldId) ||
    'Custom Field';

  const headerTitle = formatResourceHeaderTitle('Custom field', displayLabel);

  useBreadcrumbSegments('custom-field-view', [
    { label: 'Custom fields', href: '/player-custom-fields' },
    { label: displayLabel },
  ]);

  const headerActions = (
    <>
      <HeaderActionButton
        testID="player-custom-field-archive-toggle"
        label={field?.archived_at != null ? 'Unarchive' : 'Archive'}
        onPress={onArchiveToggle}
        disabled={archiving}
        variant={field?.archived_at != null ? 'success' : 'warning'}
      />
      {actions?.headerActions}
      {actions?.refresh ? (
        <HeaderActionButton
          label="Refresh"
          icon="refresh"
          variant="secondary"
          onPress={() => void actions.refresh?.()}
        />
      ) : null}
      {actions?.edit ? (
        <EditModeToggle
          isEditing={!!actions.isEditing}
          onEdit={() => actions.edit?.()}
          onSave={() => void actions.save?.()}
          onCancel={() => actions.cancel?.()}
          loading={!!actions.isSaving}
          showSave
        />
      ) : null}
    </>
  );

  return (
    <AppLayout title={headerTitle} headerActions={headerActions}>
      {children}
    </AppLayout>
  );
}

export default function ViewPlayerCustomFieldPage() {
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
    resourceIdOverride:
      fieldId && !Number.isNaN(fieldId) ? fieldId : null,
    showLinkedEntities: false,
    embedded: true,
    externalChrome: true,
    showSave: false,
    sectionLabel: 'Custom fields',
    sectionHref: '/player-custom-fields',
  } as any);

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
      showError(
        'Update failed',
        err?.message || 'Could not update archive state'
      );
    } finally {
      setArchiving(false);
    }
  };

  return (
    <PageChromeProvider>
      <CustomFieldChrome
        fieldId={fieldId}
        field={field}
        archiving={archiving}
        onArchiveToggle={() => void onArchiveToggle()}
      >
        <View>
          <ResourceViewPage config={config} />
          {isSelect && fieldId && !Number.isNaN(fieldId) ? (
            <PlayerCustomFieldOptionsPanel fieldId={fieldId} />
          ) : null}
        </View>
      </CustomFieldChrome>
    </PageChromeProvider>
  );
}
