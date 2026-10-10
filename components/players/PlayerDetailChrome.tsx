/**
 * Player detail chrome: Details | Profile Images | Custom fields | Checkouts tabs.
 */

import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import EventTabsBar, {
  type EventTabLink,
} from '@/components/events/EventTabsBar';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import EditModeToggle from '@/components/pages/EditModeToggle';
import ActionButton from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { queryKeys } from '@/lib/queryClient';
import { PlayersApiService } from '@/services/api/playersApi';
import { findActiveEventTabLabel } from '@/utils/eventTabMatch';
import {
  formatResourceHeaderTitle,
  getResourceDisplayLabel,
} from '@/utils/getResourceDisplayLabel';
import { useQuery } from '@tanstack/react-query';
import {
  Redirect,
  Slot,
  useLocalSearchParams,
  usePathname,
} from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';

const playersApi = new PlayersApiService();

export function PlayerDetailChrome() {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ id: string }>();
  const playerId = params.id;
  const numericPlayerId = playerId ? Number(playerId) : NaN;
  const { actions } = usePageChrome();
  const refreshStatus = useActionButtonStatus({
    successHoldMs: 4000,
    resetKey: pathname,
  });
  const { getMetadata } = useResourceMetadata(['Player']);
  const metadata = getMetadata('Player');

  const playerQuery = useQuery({
    queryKey: queryKeys.resourceDetail('Player', numericPlayerId),
    queryFn: async () => {
      const res = await playersApi.getPlayer(numericPlayerId);
      return res.data;
    },
    enabled: Number.isFinite(numericPlayerId),
  });

  if (
    playerId &&
    (pathname === `/players/${playerId}` || pathname === `/players/${playerId}/`)
  ) {
    return <Redirect href={`/players/${playerId}/details` as any} />;
  }

  const tabs = useMemo(
    (): EventTabLink[] => [
      {
        label: 'Details',
        href: `/players/${playerId}/details`,
        match: '/details',
      },
      {
        label: 'Profile Images',
        href: `/players/${playerId}/profile-images`,
        match: '/profile-images',
      },
      {
        label: 'Custom fields',
        href: `/players/${playerId}/custom-fields`,
        match: '/custom-fields',
      },
      {
        label: 'Checkouts',
        href: `/players/${playerId}/checkouts`,
        match: '/checkouts',
      },
    ],
    [playerId]
  );

  const resolvedDisplayTitle = getResourceDisplayLabel(
    metadata,
    playerQuery.data,
    numericPlayerId
  );
  const displayTitle = actions?.displayTitle || resolvedDisplayTitle || 'Player';
  const activeTabLabel = findActiveEventTabLabel(pathname, tabs);

  useBreadcrumbSegments('player-detail-chrome', [
    { label: 'Players', href: '/players/list' },
    {
      label: displayTitle,
      href: playerId ? `/players/${playerId}/details` : undefined,
    },
    ...(activeTabLabel ? [{ label: activeTabLabel }] : []),
  ]);

  const title = formatResourceHeaderTitle('Player', displayTitle);
  const onRefresh = useCallback(async (): Promise<void> => {
    await actions?.refresh?.();
  }, [actions]);
  const onSave = useCallback(async (): Promise<void> => {
    await actions?.save?.();
  }, [actions]);

  const headerActions = (
    <>
      {actions?.headerActions}
      {actions?.refresh && !actions?.isEditing ? (
        <ActionButton
          label="Refresh"
          startIcon="refresh"
          pendingAppearance="spinIcon"
          status={refreshStatus.status}
          errorMessage={refreshStatus.errorMessage ?? undefined}
          onPress={() => {
            void refreshStatus.run(onRefresh);
          }}
          testID="player-detail-refresh"
        />
      ) : null}
      {actions?.edit ? (
        <EditModeToggle
          isEditing={!!actions.isEditing}
          onEdit={actions.edit}
          onSave={onSave}
          onCancel={actions.cancel ?? (() => {})}
          loading={!!actions.isSaving}
          disabled={!!actions.isSaving}
        />
      ) : null}
    </>
  );

  return (
    <AppLayout
      title={title}
      headerActions={headerActions}
      tabBar={<EventTabsBar tabs={tabs} />}
    >
      <View className="flex-1">
        <Slot />
      </View>
    </AppLayout>
  );
}
