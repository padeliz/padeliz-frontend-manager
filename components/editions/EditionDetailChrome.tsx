/**
 * Edition detail chrome: ED picker, tabs, finalize/save/refresh.
 */

import EditionDivisionPicker from '@/components/editions/EditionDivisionPicker';
import EditionTabsBar from '@/components/editions/EditionTabsBar';
import { confirmAction } from '@/components/editions/editionLotteryUtils';
import { usePageChrome } from '@/components/chrome/PageChromeProvider';
import AppLayout from '@/components/layout/AppLayout';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
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
import { Ionicons } from '@expo/vector-icons';
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
  Pressable,
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
  const showEdPicker = !isDetails && !isRegistrations;
  const isFinalized = !!(editionQuery.data as any)?.finalized_at;
  const finalizedAt = (editionQuery.data as any)?.finalized_at as
    | number
    | null
    | undefined;

  const tabs = useMemo(
    () => buildEditionTopTabs(editionId, selectedDivisionId, selectedLotteryId),
    [editionId, selectedDivisionId, selectedLotteryId]
  );

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
    : 'Edition';

  if (!Number.isFinite(editionId)) {
    return <Text className="p-4 text-red-600">Invalid edition id</Text>;
  }

  if (editionQuery.isLoading && !editionQuery.data) {
    return (
      <AppLayout title="Edition">
        <ActivityIndicator className="m-8" />
      </AppLayout>
    );
  }

  const canSave =
    !!actions?.canSave &&
    !!actions?.isDirty &&
    (!isFinalized || isDetails);

  return (
    <AppLayout title={title}>
      <View className="flex-1">
        <View className="flex-row items-center flex-wrap p-4 border-b border-gray-200 gap-2">
          <Pressable onPress={() => void onBack()} className="mr-1 p-2">
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
          </Pressable>
          <View className="flex-1 min-w-[140px]">
            <Text className="text-lg font-semibold text-gray-900">{title}</Text>
            <Text className="text-sm text-gray-600">
              ID {editionId}
              {selectedDivisionId ? ` · ED ${selectedDivisionId}` : ' · General'}
            </Text>
          </View>

          {showEdPicker && (
            <EditionDivisionPicker
              divisions={divisions}
              value={selectedDivisionId}
              onChange={id => void setEd(id)}
              includeGeneral
            />
          )}

          {isFinalized && finalizedAt != null ? (
            <View className="rounded-lg px-3 py-2 border bg-gray-100 border-gray-200">
              <Text className="text-sm font-medium text-gray-700">
                Finalized {formatFinalizedAt(finalizedAt)}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => void onFinalize()}
              className="rounded-lg px-3 py-2 border bg-amber-50 border-amber-300"
            >
              <Text className="text-sm font-medium text-amber-800">
                Finalize
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => void onSave()}
            disabled={!canSave || !!actions?.isSaving}
            className={`rounded-lg px-3 py-2 ${
              canSave && !actions?.isSaving ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <Text className="text-sm text-white font-medium">
              {actions?.isSaving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void onRefresh()}
            className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2"
          >
            <Text className="text-sm text-gray-700">Refresh</Text>
          </Pressable>
        </View>

        <EditionTabsBar tabs={tabs} onBeforeNavigate={discardIfNeeded} />

        <View className="flex-1">
          <Slot />
        </View>
      </View>
    </AppLayout>
  );
}
