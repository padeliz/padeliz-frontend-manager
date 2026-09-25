import { usePageChromeActionsRef } from '@/components/chrome/PageChromeProvider';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import { useSubTabBar } from '@/components/layout/SubTabBarProvider';
import { useEditionLotterySelection } from '@/hooks/useEditionLotterySelection';
import {
  parseEditionDivisionIdOptimistic,
  withEdQuery,
  withLotteryQuery,
} from '@/utils/editionWorkspace';
import { lotteryQueryId } from '@/utils/edition/lotteryUrlSync';
import { findActiveEditionTabLabel } from '@/utils/editionTabMatch';
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
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { useQuery } from '@tanstack/react-query';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import type { EditionTabLink } from '@/components/editions/EditionTabsBar';

const editionDivisionsApi = new EditionDivisionsApiService();

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
  const editionId = Number(localParams.id ?? globalParams.id);
  const edParam = localParams.ed ?? globalParams.ed;
  const actionsRef = usePageChromeActionsRef();
  const divisionsQuery = useQuery({
    queryKey: queryKeys.editionDivisions(editionId),
    queryFn: async () => {
      const res = await editionDivisionsApi.getEditionDivisions({
        per_page: 100,
        filters: { edition_id: editionId },
      });
      return res.data || [];
    },
    enabled: Number.isFinite(editionId),
  });
  const divisions = divisionsQuery.data || [];
  // Match lotteriesLoaded: empty [] is loaded (truthy !![]), but prefer
  // !== undefined so null/missing data cannot disagree with schedule.
  const divisionsLoaded =
    !divisionsQuery.isLoading && divisionsQuery.data !== undefined;
  const edId = parseEditionDivisionIdOptimistic(
    edParam,
    divisions.map(d => d.id_edition_division),
    divisionsLoaded
  );

  const { lotteries, lotteriesLoaded, lotteryId, rawLotteryId } =
    useEditionLotterySelection(editionId);
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
      `/lottery-live/${editionId}`,
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

  const tabs = useMemo((): EditionTabLink[] => {
    const base = `/editions/${editionId}/lottery`;
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
        href: withLotteryQuery(`/lottery-live/${editionId}`, hrefLotteryId),
        match: '/lottery-live',
        variant: 'live',
        disabled: liveSelectionId == null,
        onPress: openLiveLottery,
      },
    ];
  }, [editionId, edId, hrefLotteryId, liveSelectionId, openLiveLottery]);

  const activeTabLabel = findActiveEditionTabLabel(pathname, tabs) ?? 'Prizes';

  useBreadcrumbSegments(
    'edition-lottery-subtab',
    [{ label: activeTabLabel }],
    1
  );

  useSubTabBar('edition-lottery-subtab', tabs, onBeforeNavigate);

  return <Slot />;
}
