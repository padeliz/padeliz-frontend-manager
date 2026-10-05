import type { EventTabLink } from '@/components/events/EventTabsBar';
import { usePageChromeActionsRef } from '@/components/chrome/PageChromeProvider';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import { useSubTabBar } from '@/components/layout/SubTabBarProvider';
import {
  parseEventDivisionIdOptimistic,
  withEdQuery,
} from '@/utils/eventWorkspace';
import { findActiveEventTabLabel } from '@/utils/eventTabMatch';
import { queryKeys } from '@/lib/queryClient';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { useQuery } from '@tanstack/react-query';
import { Slot, useGlobalSearchParams, useLocalSearchParams, usePathname } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';

const eventDivisionsApi = new EventDivisionsApiService();

export default function RegistrationsLayout() {
  const pathname = usePathname();
  const localParams = useLocalSearchParams<{ id: string; ed?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string; ed?: string }>();
  const eventId = Number(localParams.id ?? globalParams.id);
  const edParam = globalParams.ed ?? localParams.ed;
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
  const divisionsLoaded = !divisionsQuery.isLoading && !!divisionsQuery.data;
  const edId = parseEventDivisionIdOptimistic(
    edParam,
    divisions.map(d => d.id_event_division),
    divisionsLoaded
  );

  const onBeforeNavigate = useCallback(async () => {
    if (!actionsRef.current?.isDirty) return true;
    const ok = await confirmDiscardDirty();
    if (!ok) return false;
    actionsRef.current.cancel?.();
    return true;
  }, []);

  const tabs = useMemo((): EventTabLink[] => {
    const base = `/events/${eventId}/registrations`;
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
  }, [eventId, edId]);

  const activeTabLabel = findActiveEventTabLabel(pathname, tabs) ?? 'List';

  useBreadcrumbSegments(
    'event-registrations-subtab',
    [{ label: activeTabLabel }],
    1
  );

  useSubTabBar('event-registrations-subtab', tabs, onBeforeNavigate);

  return <Slot />;
}
