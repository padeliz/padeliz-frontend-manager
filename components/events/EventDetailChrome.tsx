/**
 * Event detail chrome: ED picker, tabs, finalize/save/refresh.
 */

import {
  usePageChrome,
  usePageChromeActionsRef,
} from '@/components/chrome/PageChromeProvider';
import FullscreenToggleButton from '@/components/chrome/FullscreenToggleButton';
import EventDivisionPicker from '@/components/events/EventDivisionPicker';
import EventLotteryPicker from '@/components/events/lottery/EventLotteryPicker';
import EventTabsBar from '@/components/events/EventTabsBar';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import EditModeToggle from '@/components/pages/EditModeToggle';
import ActionButton from '@/components/ui/ActionButton';
import type { ActionButtonStatus } from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { useEventLotterySelection } from '@/hooks/useEventLotterySelection';
import { queryKeys } from '@/lib/queryClient';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { EventsApiService } from '@/services/api/eventsApi';
import type { ApiEventDivision } from '@/types/api/entities';
import { confirmAction } from '@/utils/confirmAction';
import { lotteryQueryId } from '@/utils/event/lotteryUrlSync';
import { findActiveEventTabLabel } from '@/utils/eventTabMatch';
import {
  buildEventTopTabs,
  parseEventDivisionIdOptimistic,
  withEdQuery,
  withLotteryQuery,
} from '@/utils/eventWorkspace';
import {
  confirmDiscardDirty,
  formatFinalizedAt,
} from '@/utils/softDirtyNav';
import { formatDisplayDate } from '@/utils/fieldFormatter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Slot,
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, BackHandler, Text, View } from 'react-native';

const eventsApi = new EventsApiService();
const eventDivisionsApi = new EventDivisionsApiService();

type HeaderButtonStatus = {
  status: ActionButtonStatus;
  errorMessage: string | null;
  run: (fn: () => Promise<void>) => Promise<void>;
};

type EventChromeHeaderActionsProps = {
  eventId: number;
  pathname: string;
  isLottery: boolean;
  showEdPicker: boolean;
  isDetails: boolean;
  isFinalized: boolean;
  finalizedAt: number | null | undefined;
  divisions: ApiEventDivision[];
  selectedDivisionId: number | null;
  setEd: (id: number | null) => void;
  finalizeStatus: HeaderButtonStatus;
  saveStatus: HeaderButtonStatus;
  refreshStatus: HeaderButtonStatus;
  onFinalizePress: () => void;
  onSave: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

export function EventChromeHeaderActions({
  eventId,
  pathname,
  isLottery,
  showEdPicker,
  isDetails,
  isFinalized,
  finalizedAt,
  divisions,
  selectedDivisionId,
  setEd,
  finalizeStatus,
  saveStatus,
  refreshStatus,
  onFinalizePress,
  onSave,
  onRefresh,
}: EventChromeHeaderActionsProps) {
  const { actions } = usePageChrome();
  const actionsRef = usePageChromeActionsRef();

  const canSave =
    !!actions?.canSave &&
    !!actions?.isDirty &&
    (!isFinalized || isDetails);

  const showEditToggle =
    !!actions?.edit && (isDetails || !!actions?.isEditing);

  return (
    <>
      {isLottery ? <EventLotteryPicker eventId={eventId} /> : null}

      {showEdPicker ? (
        <EventDivisionPicker
          divisions={divisions}
          value={selectedDivisionId}
          onChange={id => void setEd(id)}
          includeGeneral
        />
      ) : null}

      {isFinalized && finalizedAt != null ? (
        <View className="rounded-lg px-3 py-2 border bg-gray-100 border-gray-200">
          <Text className="text-sm font-medium text-gray-700">
            Finalized {formatFinalizedAt(finalizedAt)}
          </Text>
        </View>
      ) : (
        <ActionButton
          label="Finalize"
          variant="warning"
          status={finalizeStatus.status}
          errorMessage={finalizeStatus.errorMessage ?? undefined}
          onPress={onFinalizePress}
          testID="event-chrome-finalize"
        />
      )}

      {!actions?.isEditing ? (
        <ActionButton
          label="Save"
          variant="primary"
          status={saveStatus.status}
          errorMessage={saveStatus.errorMessage ?? undefined}
          onPress={() => {
            void saveStatus.run(onSave);
          }}
          disabled={!canSave}
          testID="event-chrome-save"
        />
      ) : null}

      <ActionButton
        label="Refresh"
        startIcon="refresh"
        pendingAppearance="spinIcon"
        status={refreshStatus.status}
        errorMessage={refreshStatus.errorMessage ?? undefined}
        onPress={() => {
          void refreshStatus.run(onRefresh);
        }}
        testID="event-chrome-refresh"
      />

      {actions?.headerActions}

      {showEditToggle ? (
        <EditModeToggle
          isEditing={!!actions?.isEditing}
          onEdit={() => actionsRef.current?.edit?.()}
          onSave={onSave}
          onCancel={() => actionsRef.current?.cancel?.()}
          loading={!!actions?.isSaving}
          disabled={!!actions?.isSaving}
          showSave
        />
      ) : null}

      {pathname.includes('/lottery/luckies') ? (
        <FullscreenToggleButton />
      ) : null}
    </>
  );
}

export function EventChrome() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const actionsRef = usePageChromeActionsRef();
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
  const lotteryParam = localParams.lottery ?? globalParams.lottery;
  const actionButtonResetKey = `${pathname}|${edParam ?? ''}|${lotteryParam ?? ''}`;
  const finalizeStatus = useActionButtonStatus({
    auditoryFeedback: true,
    resetKey: actionButtonResetKey,
  });
  const saveStatus = useActionButtonStatus({
    auditoryFeedback: true,
    resetKey: actionButtonResetKey,
  });
  const refreshStatus = useActionButtonStatus({
    successHoldMs: 4000,
    resetKey: actionButtonResetKey,
  });
  const { lotteries, lotteriesLoaded, lotteryId, rawLotteryId } =
    useEventLotterySelection(eventId);
  const hrefLotteryId = lotteryQueryId({
    lotteriesLoaded,
    lotteries,
    lotteryId,
    rawLotteryId,
  });

  const eventQuery = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: async () => {
      const res = await eventsApi.getEvent(eventId);
      return res.data;
    },
    enabled: Number.isFinite(eventId),
  });

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
  const validIds = divisions.map(d => Number(d.id_event_division));
  const selectedDivisionId = parseEventDivisionIdOptimistic(
    edParam,
    validIds,
    divisionsLoaded
  );

  const isDetails = pathname.includes('/details');
  const isRegistrations = pathname.includes('/registrations');
  const isDivisions = pathname.includes('/divisions');
  const isLottery = pathname.includes('/lottery');
  const showEdPicker =
    !isDetails && !isRegistrations && !isDivisions && !isLottery;
  const isFinalized = !!(eventQuery.data as any)?.finalized_at;
  const finalizedAt = (eventQuery.data as any)?.finalized_at as
    | number
    | null
    | undefined;

  const tabs = useMemo(
    () => buildEventTopTabs(eventId, selectedDivisionId, hrefLotteryId),
    [eventId, selectedDivisionId, hrefLotteryId]
  );

  const eventLabel =
    eventQuery.data?.name ?? String(eventId);
  const activeTopTabLabel = findActiveEventTabLabel(pathname, tabs);

  useBreadcrumbSegments('event-chrome', [
    { label: 'Events', href: '/events' },
    {
      label: eventLabel,
      href: `/events/${eventId}/details`,
    },
    ...(activeTopTabLabel ? [{ label: activeTopTabLabel }] : []),
  ]);

  const discardIfNeeded = useCallback(async (): Promise<boolean> => {
    if (!actionsRef.current?.isDirty) return true;
    const ok = await confirmDiscardDirty();
    if (!ok) return false;
    actionsRef.current.cancel?.();
    return true;
  }, []);

  const navigateEd = useCallback(
    (id: number | null) => {
      const next =
        id == null
          ? withLotteryQuery(pathname, hrefLotteryId)
          : withLotteryQuery(withEdQuery(pathname, id), hrefLotteryId);
      router.replace(next as any);
    },
    [pathname, router, hrefLotteryId]
  );

  const setEd = useCallback(
    async (id: number | null) => {
      if (id === selectedDivisionId) return;
      if (!(await discardIfNeeded())) return;
      navigateEd(id);
    },
    [discardIfNeeded, navigateEd, selectedDivisionId]
  );

  const onRefresh = useCallback(async (): Promise<void> => {
    if (!(await discardIfNeeded())) return;
    if (actionsRef.current?.refresh) {
      await actionsRef.current.refresh();
      return;
    }
    await queryClient.invalidateQueries(
      { queryKey: queryKeys.event(eventId) },
      { throwOnError: true }
    );
    await queryClient.invalidateQueries(
      {
        queryKey: queryKeys.eventDivisions(eventId),
      },
      { throwOnError: true }
    );
    if (selectedDivisionId) {
      await queryClient.invalidateQueries(
        {
          queryKey: queryKeys.schedule(selectedDivisionId),
        },
        { throwOnError: true }
      );
    }
  }, [actionsRef, discardIfNeeded, eventId, queryClient, selectedDivisionId]);

  const onSave = useCallback(async (): Promise<void> => {
    await actionsRef.current?.save?.();
  }, [actionsRef]);

  const doFinalize = useCallback(async (): Promise<void> => {
    await eventsApi.finalizeEvent(eventId);
    await queryClient.invalidateQueries(
      {
        queryKey: queryKeys.event(eventId),
      },
      { throwOnError: true }
    );
    await queryClient.invalidateQueries(
      {
        queryKey: queryKeys.eventDivisions(eventId),
      },
      { throwOnError: true }
    );
  }, [eventId, queryClient]);

  const onFinalizePress = useCallback(() => {
    if (isFinalized) return;
    void (async () => {
      if (!(await discardIfNeeded())) return;
      const message =
        'This cannot be undone. Schedule, scores, divisions, and related edits will lock. Event details stay editable.';
      confirmAction('Finalize event?', message, () => {
        void finalizeStatus.run(doFinalize);
      });
    })();
  }, [discardIfNeeded, doFinalize, finalizeStatus.run, isFinalized]);

  const onBack = useCallback(async () => {
    if (!(await discardIfNeeded())) return;
    router.back();
  }, [discardIfNeeded, router]);

  useEffect(() => {
    const onPopState = () => {
      if (!actionsRef.current?.isDirty) return;
      void (async () => {
        const ok = await confirmDiscardDirty();
        if (!ok) {
          history.pushState(null, '', window.location.href);
        } else {
          actionsRef.current?.cancel?.();
        }
      })();
    };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const beforeUnload = (ev: BeforeUnloadEvent) => {
        if (!actionsRef.current?.isDirty) return;
        ev.preventDefault();
        ev.returnValue = '';
      };
      window.addEventListener('beforeunload', beforeUnload);
      window.addEventListener('popstate', onPopState);
      return () => {
        window.removeEventListener('beforeunload', beforeUnload);
        window.removeEventListener('popstate', onPopState);
      };
    }
    return undefined;
  }, [actionsRef]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!actionsRef.current?.isDirty) return false;
      void onBack();
      return true;
    });
    return () => sub.remove();
  }, [actionsRef, onBack]);

  const title = eventQuery.data
    ? `Event: ${eventQuery.data.name}`
    : `Event: ${eventId}`;

  const description = useMemo(() => {
    const raw = eventQuery.data?.date?.trim();
    if (!raw) return undefined;
    return formatDisplayDate(raw);
  }, [eventQuery.data?.date]);

  if (!Number.isFinite(eventId)) {
    return <Text className="p-4 text-red-600">Invalid event id</Text>;
  }

  if (eventQuery.isLoading && !eventQuery.data) {
    return (
      <AppLayout title="Event">
        <ActivityIndicator className="m-8" testID="event-chrome-loading" />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={title}
      description={description}
      headerActions={
        <EventChromeHeaderActions
          eventId={eventId}
          pathname={pathname}
          isLottery={isLottery}
          showEdPicker={showEdPicker}
          isDetails={isDetails}
          isFinalized={isFinalized}
          finalizedAt={finalizedAt}
          divisions={divisions}
          selectedDivisionId={selectedDivisionId}
          setEd={id => void setEd(id)}
          finalizeStatus={finalizeStatus}
          saveStatus={saveStatus}
          refreshStatus={refreshStatus}
          onFinalizePress={onFinalizePress}
          onSave={onSave}
          onRefresh={onRefresh}
        />
      }
      tabBar={
        <EventTabsBar tabs={tabs} onBeforeNavigate={discardIfNeeded} />
      }
    >
      <View className="flex-1">
        <Slot />
      </View>
    </AppLayout>
  );
}
