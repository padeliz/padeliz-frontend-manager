/**
 * Custom field detail — hybrid AppLayout + embedded ResourceViewPage.
 */

import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import EditModeToggle from '@/components/pages/EditModeToggle';
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import PlayerCustomFieldOptionsPanel from '@/components/playerCustomFields/PlayerCustomFieldOptionsPanel';
import ActionButton from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
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
  onArchiveToggle,
  children,
}: {
  fieldId: number;
  field: ApiPlayerCustomField | null;
  onArchiveToggle: () => Promise<void>;
  children: React.ReactNode;
}) {
  const { actions } = usePageChrome();
  const archiveStatus = useActionButtonStatus({ auditoryFeedback: true });
  const refreshStatus = useActionButtonStatus({ successHoldMs: 4000 });
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
      <ActionButton
        testID="player-custom-field-archive-toggle"
        label={field?.archived_at != null ? 'Unarchive' : 'Archive'}
        status={archiveStatus.status}
        errorMessage={archiveStatus.errorMessage ?? undefined}
        onPress={() => {
          if (!fieldId || Number.isNaN(fieldId)) return;
          void archiveStatus.run(onArchiveToggle);
        }}
        variant={field?.archived_at != null ? 'success' : 'warning'}
      />
      {actions?.headerActions}
      {actions?.refresh ? (
        <ActionButton
          label="Refresh"
          startIcon="refresh"
          pendingAppearance="spinIcon"
          variant="secondary"
          status={refreshStatus.status}
          errorMessage={refreshStatus.errorMessage ?? undefined}
          onPress={() => {
            void refreshStatus.run(async () => {
              await actions.refresh?.();
            });
          }}
        />
      ) : null}
      {actions?.edit ? (
        <EditModeToggle
          isEditing={!!actions.isEditing}
          onEdit={() => actions.edit?.()}
          onSave={async () => {
            await actions.save?.();
          }}
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
  const [field, setField] = useState<ApiPlayerCustomField | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

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
    if (field?.archived_at != null) {
      const response = await api.unarchivePlayerCustomField(fieldId);
      setField(response.data);
    } else {
      const response = await api.archivePlayerCustomField(fieldId);
      setField(response.data);
    }
    refresh();
  };

  return (
    <PageChromeProvider>
      <CustomFieldChrome
        fieldId={fieldId}
        field={field}
        onArchiveToggle={onArchiveToggle}
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
