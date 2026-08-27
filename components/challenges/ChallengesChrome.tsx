import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import EditionTabsBar, {
  EditionTabLink,
} from '@/components/editions/EditionTabsBar';
import AppLayout from '@/components/layout/AppLayout';
import HeaderActionButton from '@/components/ui/HeaderActionButton';
import { findActiveEditionTabLabel } from '@/utils/editionTabMatch';
import { Slot, usePathname } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

export function ChallengesChrome() {
  const pathname = usePathname();
  const { actions } = usePageChrome();

  const tabs: EditionTabLink[] = useMemo(
    () => [
      { label: 'All', href: '/challenges/all', match: '/all' },
      {
        label: 'King of the Court',
        href: '/challenges/king-of-the-court',
        match: 'king-of-the-court',
      },
      {
        label: 'Smash Contest',
        href: '/challenges/smash-contest',
        match: 'smash-contest',
      },
    ],
    []
  );

  const activeTabLabel = findActiveEditionTabLabel(pathname, tabs);

  const headerActions = (
    <>
      <HeaderActionButton
        label="Refresh"
        icon="refresh"
        onPress={() => void actions?.refresh?.()}
        testID="challenges-chrome-refresh"
      />
      {actions?.headerActions}
    </>
  );

  return (
    <AppLayout
      title="Challenges"
      subtitle={activeTabLabel ?? undefined}
      headerActions={headerActions}
      tabBar={<EditionTabsBar tabs={tabs} />}
    >
      <View className="flex-1">
        <Slot />
      </View>
    </AppLayout>
  );
}
