/**
 * Edition detail chrome: ED picker, tabs, finalize/save/refresh.
 */

import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import EditionDivisionPicker from '@/components/editions/EditionDivisionPicker';
import EditionTabsBar from '@/components/editions/EditionTabsBar';
import { confirmAction } from '@/components/editions/editionLotteryUtils';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import EditModeToggle from '@/components/pages/EditModeToggle';
import HeaderActionButton from '@/components/ui/HeaderActionButton';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import { findActiveEditionTabLabel } from '@/utils/editionTabMatch';
import {
  buildEditionTopTabs,
  parseEditionDivisionIdOptimistic,
  parseLotteryId,
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
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Text,
  View,
} from 'react-native';

const editionsApi = new EditionsApiService();
const editionDivisionsApi = new EditionDivisionsApiService();

export function EditionChrome() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { actions } = usePageChrome();
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
  const edParam = globalParams.ed ?? localParams.ed;
  const lotteryParam = globalParams.lottery ?? localParams.lottery;

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
  const selectedLotteryId = parseLotteryId(lotteryParam);

  const isDetails = pathname.includes('/details');
  const isRegistrations = pathname.includes('/registrations');
  const isDivisions = pathname.includes('/divisions');
  const showEdPicker = !isDetails && !isRegistrations && !isDivisions;
  const isFinalized = !!(editionQuery.data as any)?.finalized_at;
  const finalizedAt = (editionQuery.data as any)?.finalized_at as
    | number
    | null
    | undefined;

  const tabs = useMemo(
    () => buildEditionTopTabs(editionId, selectedDivisionId, selectedLotteryId),
    [editionId, selectedDivisionId, selectedLotteryId]
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
    if (!actions?.isDirty) return true;
    const ok = await confirmDiscardDirty();
    if (!ok) return false;
    actions.cancel?.();
    return true;
  }, [actions]);

  const navigateEd = useCallback(
    (id: number | null) => {
      const next =
        id == null
          ? withLotteryQuery(pathname, selectedLotteryId)
          : withLotteryQuery(withEdQuery(pathname, id), selectedLotteryId);
      router.replace(next as any);
    },
    [pathname, router, selectedLotteryId]
  );

  const setEd = useCallback(
    async (id: number | null) => {
      if (id === selectedDivisionId) return;
      if (!(await discardIfNeeded())) return;
      navigateEd(id);
    },
    [discardIfNeeded, navigateEd, selectedDivisionId]
  );

  const onRefresh = useCallback(async () => {
    if (!(await discardIfNeeded())) return;
    if (actions?.refresh) {
      await actions.refresh();
      return;
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.edition(editionId) });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.editionDivisions(editionId),
    });
    if (selectedDivisionId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.schedule(selectedDivisionId),
      });
    }
  }, [
    actions,
    discardIfNeeded,
    editionId,
    queryClient,
    selectedDivisionId,
  ]);

  const onSave = useCallback(async () => {
    if (actions?.save) await actions.save();
  }, [actions]);

  const onFinalize = useCallback(async () => {
    if (isFinalized) return;
    if (!(await discardIfNeeded())) return;
    confirmAction(
      'Finalize edition?',
      'This cannot be undone. Schedule, scores, divisions, and related edits will lock. Edition details stay editable.',
      () => {
        void (async () => {
          try {
            await editionsApi.finalizeEdition(editionId);
            await queryClient.invalidateQueries({
              queryKey: queryKeys.edition(editionId),
            });
            await queryClient.invalidateQueries({
              queryKey: queryKeys.editionDivisions(editionId),
            });
          } catch (e: any) {
            Alert.alert('Finalize failed', e?.message || 'Unknown error');
          }
        })();
      }
    );
  }, [discardIfNeeded, editionId, isFinalized, queryClient]);

  const onBack = useCallback(async () => {
    if (!(await discardIfNeeded())) return;
    router.back();
  }, [discardIfNeeded, router]);

  useEffect(() => {
    const onPopState = () => {
      if (!actions?.isDirty) return;
      void (async () => {
        const ok = await confirmDiscardDirty();
        if (!ok) {
          history.pushState(null, '', window.location.href);
        } else {
          actions.cancel?.();
        }
      })();
    };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const beforeUnload = (ev: BeforeUnloadEvent) => {
        if (!actions?.isDirty) return;
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
  }, [actions]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!actions?.isDirty) return false;
      void onBack();
      return true;
    });
    return () => sub.remove();
  }, [actions?.isDirty, onBack]);

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

  const canSave =
    !!actions?.canSave &&
    !!actions?.isDirty &&
    (!isFinalized || isDetails);

  const showEditToggle =
    !!actions?.edit && (isDetails || !!actions?.isEditing);

  const headerActions = (
    <>
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
        <HeaderActionButton
          label="Finalize"
          variant="warning"
          onPress={() => void onFinalize()}
          testID="edition-chrome-finalize"
        />
      )}

      {!actions?.isEditing ? (
        <HeaderActionButton
          label="Save"
          variant="primary"
          onPress={() => void onSave()}
          disabled={!canSave}
          loading={!!actions?.isSaving}
          testID="edition-chrome-save"
        />
      ) : null}

      <HeaderActionButton
        label="Refresh"
        icon="refresh"
        onPress={() => void onRefresh()}
        testID="edition-chrome-refresh"
      />

      {actions?.headerActions}

      {showEditToggle ? (
        <EditModeToggle
          isEditing={!!actions?.isEditing}
          onEdit={actions!.edit!}
          onSave={() => void onSave()}
          onCancel={actions!.cancel ?? (() => {})}
          loading={!!actions?.isSaving}
          disabled={!!actions?.isSaving}
          showSave
        />
      ) : null}
    </>
  );

  return (
    <AppLayout
      title={title}
      description={description}
      headerActions={headerActions}
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
