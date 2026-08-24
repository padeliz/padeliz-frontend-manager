import type { EditionTabLink } from '@/components/editions/EditionTabsBar';
import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import { useSubTabBar } from '@/components/layout/SubTabBarProvider';
import {
  parseEditionDivisionIdOptimistic,
  withEdQuery,
} from '@/utils/editionWorkspace';
import { findActiveEditionTabLabel } from '@/utils/editionTabMatch';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { useQuery } from '@tanstack/react-query';
import { Slot, useGlobalSearchParams, useLocalSearchParams, usePathname } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';

const editionDivisionsApi = new EditionDivisionsApiService();

export default function RegistrationsLayout() {
  const pathname = usePathname();
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

  const tabs = useMemo((): EditionTabLink[] => {
    const base = `/editions/${editionId}/registrations`;
    return [
      {
        label: 'List',
        href: withEdQuery(base, edId),
        match: '/registrations',
        matchExact: true,
      },
      {
        label: 'Register Players',
        href: withEdQuery(`${base}/register-players`, edId),
        match: '/register-players',
      },
    ];
  }, [editionId, edId]);

  const activeTabLabel = findActiveEditionTabLabel(pathname, tabs) ?? 'List';

  useBreadcrumbSegments(
    'edition-registrations-subtab',
    [{ label: activeTabLabel }],
    1
  );

  useSubTabBar('edition-registrations-subtab', tabs, onBeforeNavigate);

  return <Slot />;
}
