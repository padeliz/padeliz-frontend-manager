import { usePageChromeActionsRef } from '@/components/chrome/PageChromeProvider';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import { useSubTabBar } from '@/components/layout/SubTabBarProvider';
import { useEventLotterySelection } from '@/hooks/useEventLotterySelection';
import {
  parseEventDivisionIdOptimistic,
  withEdQuery,
  withLotteryQuery,
} from '@/utils/eventWorkspace';
import { lotteryQueryId } from '@/utils/event/lotteryUrlSync';
import { findActiveEventTabLabel } from '@/utils/eventTabMatch';
import {
  Slot,
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from 'expo-router';
import React, { useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { queryKeys } from '@/lib/queryClient';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { useQuery } from '@tanstack/react-query';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import type { EventTabLink } from '@/components/events/EventTabsBar';

const eventDivisionsApi = new EventDivisionsApiService();

export default function LotteryLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const localParams = useLocalSearchParams<{
    id: string;
    ed?: string;
    lottery?: string;
  }>();
  const globalParams = useGlobalSearchParams<{
    id?: string;
    ed?: string;
    lottery?: string;
  }>();
  const eventId = Number(localParams.id ?? globalParams.id);
  const edParam = localParams.ed ?? globalParams.ed;
  const actionsRef = usePageChromeActionsRef();
  const divisionsQuery = useQuery({
    queryKey: queryKeys.eventDivisions(eventId),
    queryFn: async () => {
      const res = await eventDivisionsApi.getEventDivisions({
        per_page: 100,
        filters: { event_id: eventId },
      });
      return res.data || [];
    },
    enabled: Number.isFinite(eventId),
  });
  const divisions = divisionsQuery.data || [];
  // Match lotteriesLoaded: empty [] is loaded (truthy !![]), but prefer
  // !== undefined so null/missing data cannot disagree with schedule.
  const divisionsLoaded =
    !divisionsQuery.isLoading && divisionsQuery.data !== undefined;
  const edId = parseEventDivisionIdOptimistic(
    edParam,
    divisions.map(d => d.id_event_division),
    divisionsLoaded
  );

  const { lotteries, lotteriesLoaded, lotteryId, rawLotteryId } =
    useEventLotterySelection(eventId);
  const selectionArgs = {
    lotteriesLoaded,
    lotteries,
    lotteryId,
    rawLotteryId,
  };
  const hrefLotteryId = lotteryQueryId(selectionArgs);
  // LIVE disabled uses same derived id (optimistic while loading).
  const liveSelectionId = hrefLotteryId;

  const onBeforeNavigate = useCallback(async () => {
    if (!actionsRef.current?.isDirty) return true;
    const ok = await confirmDiscardDirty();
    if (!ok) return false;
    actionsRef.current.cancel?.();
    return true;
  }, []);

  const openLiveLotteryRef = useRef(() => {});
  openLiveLotteryRef.current = () => {
    if (liveSelectionId == null) return;
    const path = withLotteryQuery(
      `/lottery-live/${eventId}`,
      liveSelectionId
    );
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url =
        typeof window.location?.origin === 'string'
          ? `${window.location.origin}${path}`
          : path;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(path as any);
  };

  const openLiveLottery = useCallback(() => {
    openLiveLotteryRef.current();
  }, []);

  const tabs = useMemo((): EventTabLink[] => {
    const base = `/events/${eventId}/lottery`;
    const href = (path: string) =>
      withLotteryQuery(withEdQuery(`${base}${path}`, edId), hrefLotteryId);
    return [
      {
        label: 'Prizes',
        href: href('/prizes'),
        match: 'prizes',
      },
      {
        label: 'Rules',
        href: href('/rules'),
        match: 'rules',
      },
      {
        label: 'Luckies',
        href: href('/luckies'),
        match: 'luckies',
      },
      {
        label: 'Open LIVE lottery',
        href: withLotteryQuery(`/lottery-live/${eventId}`, hrefLotteryId),
        match: '/lottery-live',
        variant: 'live',
        disabled: liveSelectionId == null,
        onPress: openLiveLottery,
      },
    ];
  }, [eventId, edId, hrefLotteryId, liveSelectionId, openLiveLottery]);

  const activeTabLabel = findActiveEventTabLabel(pathname, tabs) ?? 'Prizes';

  useBreadcrumbSegments(
    'event-lottery-subtab',
    [{ label: activeTabLabel }],
    1
  );

  useSubTabBar('event-lottery-subtab', tabs, onBeforeNavigate);

  return <Slot />;
}
