import EditionTabsBar from '@/components/editions/EditionTabsBar';
import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import {
  parseEditionDivisionIdOptimistic,
  withEdQuery,
} from '@/utils/editionWorkspace';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { useQuery } from '@tanstack/react-query';
import { Slot, useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';

const editionDivisionsApi = new EditionDivisionsApiService();

export default function ScheduleLayout() {
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
    enabled: Number.isFinite(editionId),
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

  const tabs = useMemo(() => {
    const base = `/editions/${editionId}/schedule`;
    return [
      {
        label: 'Knobs',
        href: withEdQuery(`${base}/knobs`, edId),
        match: '/schedule/knobs',
      },
      {
        label: 'Participations',
        href: withEdQuery(`${base}/participations`, edId),
        match: '/schedule/participations',
      },
      {
        label: 'Matches',
        href: withEdQuery(`${base}/matches`, edId),
        match: '/schedule/matches',
      },
    ];
  }, [editionId, edId]);

  return (
    <View className="flex-1">
      <EditionTabsBar tabs={tabs} onBeforeNavigate={onBeforeNavigate} />
      <Slot />
    </View>
  );
}
