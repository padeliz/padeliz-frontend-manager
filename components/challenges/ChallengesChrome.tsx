import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import EventTabsBar, {
  EventTabLink,
} from '@/components/events/EventTabsBar';
import AppLayout from '@/components/layout/AppLayout';
import ActionButton from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { findActiveEventTabLabel } from '@/utils/eventTabMatch';
import { Slot, usePathname } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';

export function ChallengesChrome() {
  const pathname = usePathname();
  const { actions } = usePageChrome();
  const refreshStatus = useActionButtonStatus({
    successHoldMs: 4000,
    resetKey: pathname,
  });

  const tabs: EventTabLink[] = useMemo(
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

  const activeTabLabel = findActiveEventTabLabel(pathname, tabs);
  const onRefresh = useCallback(async (): Promise<void> => {
    await actions?.refresh?.();
  }, [actions]);

  const headerActions = (
    <>
      <ActionButton
        label="Refresh"
        startIcon="refresh"
        pendingAppearance="spinIcon"
        status={refreshStatus.status}
        errorMessage={refreshStatus.errorMessage ?? undefined}
        onPress={() => {
          void refreshStatus.run(onRefresh);
        }}
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
      tabBar={<EventTabsBar tabs={tabs} />}
    >
      <View className="flex-1">
        <Slot />
      </View>
    </AppLayout>
  );
}
