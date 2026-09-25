/**
 * Edition detail chrome: ED picker, tabs, finalize/save/refresh.
 */

import {
  usePageChrome,
  usePageChromeActionsRef,
} from '@/components/chrome/PageChromeProvider';
import FullscreenToggleButton from '@/components/chrome/FullscreenToggleButton';
import EditionDivisionPicker from '@/components/editions/EditionDivisionPicker';
import EditionLotteryPicker from '@/components/editions/lottery/EditionLotteryPicker';
import EditionTabsBar from '@/components/editions/EditionTabsBar';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import EditModeToggle from '@/components/pages/EditModeToggle';
import ActionButton from '@/components/ui/ActionButton';
import type { ActionButtonStatus } from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { useEditionLotterySelection } from '@/hooks/useEditionLotterySelection';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import type { ApiEditionDivision } from '@/types/api/entities';
import { confirmAction } from '@/utils/confirmAction';
import { lotteryQueryId } from '@/utils/edition/lotteryUrlSync';
import { findActiveEditionTabLabel } from '@/utils/editionTabMatch';
import {
  buildEditionTopTabs,
  parseEditionDivisionIdOptimistic,
  withEdQuery,
  withLotteryQuery,
} from '@/utils/editionWorkspace';
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

const editionsApi = new EditionsApiService();
const editionDivisionsApi = new EditionDivisionsApiService();

type HeaderButtonStatus = {
  status: ActionButtonStatus;
  errorMessage: string | null;
  run: (fn: () => Promise<void>) => Promise<void>;
};

type EditionChromeHeaderActionsProps = {
  editionId: number;
  pathname: string;
  isLottery: boolean;
  showEdPicker: boolean;
  isDetails: boolean;
  isFinalized: boolean;
  finalizedAt: number | null | undefined;
  divisions: ApiEditionDivision[];
  selectedDivisionId: number | null;
  setEd: (id: number | null) => void;
  finalizeStatus: HeaderButtonStatus;
  saveStatus: HeaderButtonStatus;
  refreshStatus: HeaderButtonStatus;
  onFinalizePress: () => void;
  onSave: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

export function EditionChromeHeaderActions({
  editionId,
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
}: EditionChromeHeaderActionsProps) {
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
      {isLottery ? <EditionLotteryPicker editionId={editionId} /> : null}

      {showEdPicker ? (
        <EditionDivisionPicker
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
          testID="edition-chrome-finalize"
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
          testID="edition-chrome-save"
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
        testID="edition-chrome-refresh"
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

export function EditionChrome() {
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
  const editionId = Number(localParams.id ?? globalParams.id);
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
    useEditionLotterySelection(editionId);
  const hrefLotteryId = lotteryQueryId({
    lotteriesLoaded,
    lotteries,
    lotteryId,
    rawLotteryId,
  });

  const editionQuery = useQuery({
    queryKey: queryKeys.edition(editionId),
    queryFn: async () => {
      const res = await editionsApi.getEdition(editionId);
      return res.data;
    },
    enabled: Number.isFinite(editionId),
  });

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
  const validIds = divisions.map(d => Number(d.id_edition_division));
  const selectedDivisionId = parseEditionDivisionIdOptimistic(
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
  const isFinalized = !!(editionQuery.data as any)?.finalized_at;
  const finalizedAt = (editionQuery.data as any)?.finalized_at as
    | number
    | null
    | undefined;

  const tabs = useMemo(
    () => buildEditionTopTabs(editionId, selectedDivisionId, hrefLotteryId),
    [editionId, selectedDivisionId, hrefLotteryId]
  );

  const editionLabel =
    editionQuery.data?.name ?? String(editionId);
  const activeTopTabLabel = findActiveEditionTabLabel(pathname, tabs);

  useBreadcrumbSegments('edition-chrome', [
    { label: 'Editions', href: '/editions' },
    {
      label: editionLabel,
      href: `/editions/${editionId}/details`,
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
      { queryKey: queryKeys.edition(editionId) },
      { throwOnError: true }
    );
    await queryClient.invalidateQueries(
      {
        queryKey: queryKeys.editionDivisions(editionId),
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
  }, [actionsRef, discardIfNeeded, editionId, queryClient, selectedDivisionId]);

  const onSave = useCallback(async (): Promise<void> => {
    await actionsRef.current?.save?.();
  }, [actionsRef]);

  const doFinalize = useCallback(async (): Promise<void> => {
    await editionsApi.finalizeEdition(editionId);
    await queryClient.invalidateQueries(
      {
        queryKey: queryKeys.edition(editionId),
      },
      { throwOnError: true }
    );
    await queryClient.invalidateQueries(
      {
        queryKey: queryKeys.editionDivisions(editionId),
      },
      { throwOnError: true }
    );
  }, [editionId, queryClient]);

  const onFinalizePress = useCallback(() => {
    if (isFinalized) return;
    void (async () => {
      if (!(await discardIfNeeded())) return;
      const message =
        'This cannot be undone. Schedule, scores, divisions, and related edits will lock. Edition details stay editable.';
      confirmAction('Finalize edition?', message, () => {
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

  const title = editionQuery.data
    ? `Edition: ${editionQuery.data.name}`
    : `Edition: ${editionId}`;

  const description = useMemo(() => {
    const raw = editionQuery.data?.date?.trim();
    if (!raw) return undefined;
    return formatDisplayDate(raw);
  }, [editionQuery.data?.date]);

  if (!Number.isFinite(editionId)) {
    return <Text className="p-4 text-red-600">Invalid edition id</Text>;
  }

  if (editionQuery.isLoading && !editionQuery.data) {
    return (
      <AppLayout title="Edition">
        <ActivityIndicator className="m-8" testID="edition-chrome-loading" />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={title}
      description={description}
      headerActions={
        <EditionChromeHeaderActions
          editionId={editionId}
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
        <EditionTabsBar tabs={tabs} onBeforeNavigate={discardIfNeeded} />
      }
    >
      <View className="flex-1">
        <Slot />
      </View>
    </AppLayout>
  );
}
