/**
 * Player detail chrome: Details | Profile Images tabs.
 */

import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import EditionTabsBar, {
  type EditionTabLink,
} from '@/components/editions/EditionTabsBar';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import EditModeToggle from '@/components/pages/EditModeToggle';
import HeaderActionButton from '@/components/ui/HeaderActionButton';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { queryKeys } from '@/lib/queryClient';
import { PlayersApiService } from '@/services/api/playersApi';
import { findActiveEditionTabLabel } from '@/utils/editionTabMatch';
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
import React, { useMemo } from 'react';
import { View } from 'react-native';

const playersApi = new PlayersApiService();

export function PlayerDetailChrome() {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ id: string }>();
  const playerId = params.id;
  const numericPlayerId = playerId ? Number(playerId) : NaN;
  const { actions } = usePageChrome();
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
    (): EditionTabLink[] => [
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
    ],
    [playerId]
  );

  const resolvedDisplayTitle = getResourceDisplayLabel(
    metadata,
    playerQuery.data,
    numericPlayerId
  );
  const displayTitle = actions?.displayTitle || resolvedDisplayTitle || 'Player';
  const activeTabLabel = findActiveEditionTabLabel(pathname, tabs);

  useBreadcrumbSegments('player-detail-chrome', [
    { label: 'Players', href: '/players/list' },
    {
      label: displayTitle,
      href: playerId ? `/players/${playerId}/details` : undefined,
    },
    ...(activeTabLabel ? [{ label: activeTabLabel }] : []),
  ]);

  const title = formatResourceHeaderTitle('Player', displayTitle);

  const headerActions = (
    <>
      {actions?.headerActions}
      {actions?.refresh && !actions?.isEditing ? (
        <HeaderActionButton
          label="Refresh"
          icon="refresh"
          onPress={() => void actions.refresh?.()}
          testID="player-detail-refresh"
        />
      ) : null}
      {actions?.edit ? (
        <EditModeToggle
          isEditing={!!actions.isEditing}
          onEdit={actions.edit}
          onSave={() => void actions.save?.()}
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
      tabBar={<EditionTabsBar tabs={tabs} />}
    >
      <View className="flex-1">
        <Slot />
      </View>
    </AppLayout>
  );
}
