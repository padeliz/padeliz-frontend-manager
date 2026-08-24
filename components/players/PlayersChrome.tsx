/**
 * Players hub chrome: List | Import Players | Import Profile Images with Save/Refresh.
 */

import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import EditionTabsBar, {
  EditionTabLink,
} from '@/components/editions/EditionTabsBar';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import HeaderActionButton from '@/components/ui/HeaderActionButton';
import { findActiveEditionTabLabel } from '@/utils/editionTabMatch';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import { Slot, usePathname } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';

function isImportDraftRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  const playersIdx = parts.indexOf('players');
  if (playersIdx === -1) return false;
  const section = parts[playersIdx + 1];
  const next = parts[playersIdx + 2];
  if (
    section === 'import-players' ||
    section === 'import-profile-images' ||
    section === 'import-custom-field-values'
  ) {
    return next !== 'imports';
  }
  return false;
}

export function PlayersChrome() {
  const pathname = usePathname();
  const { actions } = usePageChrome();

  const tabs: EditionTabLink[] = useMemo(
    () => [
      { label: 'List', href: '/players/list', match: '/list' },
      {
        label: 'Import Players',
        href: '/players/import-players',
        match: 'import-players',
      },
      {
        label: 'Import Profile Images',
        href: '/players/import-profile-images',
        match: 'import-profile-images',
      },
      {
        label: 'Import Custom Field Values',
        href: '/players/import-custom-field-values',
        match: 'import-custom-field-values',
      },
    ],
    []
  );

  const activeTabLabel = findActiveEditionTabLabel(pathname, tabs);

  const isListTab =
    pathname === '/players/list' || pathname.endsWith('/players/list');

  useBreadcrumbSegments(
    'players-chrome',
    isListTab
      ? []
      : [
          { label: 'Players', href: '/players/list' },
          ...(activeTabLabel ? [{ label: activeTabLabel }] : []),
        ]
  );

  const discardIfNeeded = useCallback(async (): Promise<boolean> => {
    if (!actions?.isDirty) return true;
    const ok = await confirmDiscardDirty();
    if (!ok) return false;
    actions.cancel?.();
    return true;
  }, [actions]);

  const canSave = !!actions?.canSave;
  const showSave = isImportDraftRoute(pathname);

  const headerActions = (
    <>
      {showSave ? (
        <HeaderActionButton
          label="Save"
          variant="primary"
          onPress={() => void actions?.save?.()}
          disabled={!canSave}
          loading={!!actions?.isSaving}
          testID="players-chrome-save"
        />
      ) : null}
      <HeaderActionButton
        label="Refresh"
        icon="refresh"
        onPress={() => void actions?.refresh?.()}
        testID="players-chrome-refresh"
      />
      {actions?.headerActions}
    </>
  );

  return (
    <AppLayout
      title="Players"
      headerActions={headerActions}
      tabBar={
        <EditionTabsBar tabs={tabs} onBeforeNavigate={discardIfNeeded} />
      }
    >
      <View className="flex-1">
        <Slot />
      </View>
    </AppLayout>
  );
}
