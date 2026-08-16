import EditionTabsBar, {
  EditionTabLink,
} from '@/components/editions/EditionTabsBar';
import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import {
  parseEditionDivisionIdOptimistic,
  withEdQuery,
} from '@/utils/editionWorkspace';
import {
  Slot,
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Platform, View } from 'react-native';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { useQuery } from '@tanstack/react-query';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';

const editionDivisionsApi = new EditionDivisionsApiService();

export default function LotteryLayout() {
  const router = useRouter();
  const localParams = useLocalSearchParams<{ id: string; ed?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string; ed?: string }>();
  const editionId = Number(localParams.id ?? globalParams.id);
  const edParam = globalParams.ed ?? localParams.ed;
  const { actions } = usePageChrome();
  const divisionsQuery = useQuery({
    queryKey: queryKeys.editionDivisions(editionId),
    queryFn: async () => {
      const res = await editionDivisionsApi.getEditionDivisions({
        per_page: 100,
        filters: { edition_id: editionId },
      });
      return res.data || [];
    },
  });
  const divisions = divisionsQuery.data || [];
  const divisionsLoaded = !divisionsQuery.isLoading && !!divisionsQuery.data;
  const edId = parseEditionDivisionIdOptimistic(
    edParam,
    divisions.map(d => d.id_edition_division),
    divisionsLoaded
  );

  const onBeforeNavigate = useCallback(async () => {
    if (!actions?.isDirty) return true;
    const ok = await confirmDiscardDirty();
    if (!ok) return false;
    actions.cancel?.();
    return true;
  }, [actions]);

  const openLiveLottery = useCallback(() => {
    const path = `/lottery-live/${editionId}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url =
        typeof window.location?.origin === 'string'
          ? `${window.location.origin}${path}`
          : path;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    router.push(path as any);
  }, [editionId, router]);

  const tabs = useMemo((): EditionTabLink[] => {
    const base = `/editions/${editionId}/lottery`;
    return [
      {
        label: 'Prizes',
        href: withEdQuery(`${base}/prizes`, edId),
        match: '/lottery/prizes',
      },
      {
        label: 'Rules',
        href: withEdQuery(`${base}/rules`, edId),
        match: '/lottery/rules',
      },
      {
        label: 'Luckies',
        href: withEdQuery(`${base}/luckies`, edId),
        match: '/lottery/luckies',
      },
      {
        label: 'Open LIVE lottery',
        href: `/lottery-live/${editionId}`,
        match: '/lottery-live',
        variant: 'live',
        onPress: openLiveLottery,
      },
    ];
  }, [editionId, edId, openLiveLottery]);

  return (
    <View className="flex-1">
      <EditionTabsBar tabs={tabs} onBeforeNavigate={onBeforeNavigate} />
      <Slot />
    </View>
  );
}
