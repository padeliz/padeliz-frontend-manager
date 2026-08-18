import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { queryKeys } from '@/lib/queryClient';
import { EditionLotteriesApiService } from '@/services/api/editionLotteriesApi';
import { EditionLotteryPrizesApiService } from '@/services/api/editionLotteryPrizesApi';
import { EditionLotteryRulesApiService } from '@/services/api/editionLotteryRulesApi';
import { lotteryLiveApi } from '@/services/api/lotteryLiveApi';
import { PlayersApiService } from '@/services/api/playersApi';
import { ApiError } from '@/services/api/baseApi';
import { ApiEditionDivision, ApiEditionLottery, ApiEditionLotteryPrize } from '@/types/api/entities';
import { ApiEditionLotteryRule } from '@/types/api/edition';
import {
  parseLotteryId,
  withEdQuery,
  withLotteryQuery,
} from '@/utils/editionWorkspace';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  confirmAction,
  divisionLabel,
  formatAnnounceCountdown,
  formatLastRefreshRelative,
  formatLotteryTimestamp,
  luckyLifecycleRows,
  phoneNumbersFromLucky,
  primaryLuckyLifecycle,
} from './editionLotteryUtils';

export type EditionLotteryMode = 'prizes' | 'rules' | 'luckies';

type Props = {
  editionId: number;
  editionDivisionId?: number | null;
  mode: EditionLotteryMode;
  divisions?: ApiEditionDivision[];
  editionFinalized?: boolean;
};

function DeepLinkButton({
  label,
  href,
  testID,
}: {
  label: string;
  href: string;
  testID?: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const url =
            typeof window.location?.origin === 'string' && href.startsWith('/')
              ? `${window.location.origin}${href}`
              : href;
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }
        router.push(href as any);
      }}
      className="bg-gray-100 border border-gray-300 px-3 py-2 rounded-lg"
    >
      <Text className="text-sm text-gray-700">{label}</Text>
    </Pressable>
  );
}

function LotteryDeepLinks({
  mode,
  lotteryId,
  ruleId,
}: {
  mode: EditionLotteryMode;
  lotteryId?: number | null;
  ruleId?: number | null;
  luckyId?: number | null;
}) {
  if (mode === 'prizes') {
    return (
      <View className="flex-row flex-wrap gap-2">
        <DeepLinkButton
          testID="lottery-link-lotteries"
          label="Manage lotteries"
          href="/edition-lotteries"
        />
        <DeepLinkButton
          testID="lottery-link-add-lottery"
          label="Add lottery"
          href="/edition-lotteries/add"
        />
        {lotteryId != null && (
          <DeepLinkButton
            testID="lottery-link-edit-lottery"
            label={`Edit lottery #${lotteryId}`}
            href={`/edition-lotteries/${lotteryId}`}
          />
        )}
        <DeepLinkButton
          testID="lottery-link-prizes"
          label="Manage prizes"
          href="/prizes"
        />
        <DeepLinkButton
          testID="lottery-link-add-prize"
          label="Add prize"
          href="/prizes/add"
        />
        <DeepLinkButton
          testID="lottery-link-lottery-prizes"
          label="Manage lottery prizes"
          href="/edition-lottery-prizes"
        />
        <DeepLinkButton
          testID="lottery-link-add-lottery-prize"
          label="Add lottery prize"
          href="/edition-lottery-prizes/add"
        />
        <DeepLinkButton
          testID="lottery-link-sponsors"
          label="Manage sponsors"
          href="/sponsors"
        />
      </View>
    );
  }
  if (mode === 'rules') {
    return (
      <View className="flex-row flex-wrap gap-2">
        <DeepLinkButton
          testID="lottery-link-rules"
          label="Manage rules"
          href="/edition-lottery-rules"
        />
        <DeepLinkButton
          testID="lottery-link-add-rule"
          label="Add rule"
          href="/edition-lottery-rules/add"
        />
        {ruleId != null && (
          <DeepLinkButton
            label={`Edit rule #${ruleId}`}
            href={`/edition-lottery-rules/${ruleId}`}
          />
        )}
      </View>
    );
  }
  return null;
}

const lotteriesApi = new EditionLotteriesApiService();
const lotteryPrizesApi = new EditionLotteryPrizesApiService();
const rulesApi = new EditionLotteryRulesApiService();
const playersApi = new PlayersApiService();

function playerLabelFromParticipation(p: any): string {
  const player = p?.player ?? p?.drawnParticipation?.player;
  if (!player) return `Participation #${p?.id_participation ?? p?.drawn_participation_id ?? '?'}`;
  return (
    player.name ||
    [player.first_name, player.last_name].filter(Boolean).join(' ') ||
    `Player #${player.id_player ?? player.player_id}`
  );
}

function ruleSummary(rule: ApiEditionLotteryRule): string {
  const parts = [`qty ${rule.rule_prize_quantity}`];
  if (rule.gender) parts.push(String(rule.gender));
  if (rule.has_social_status) parts.push(String(rule.has_social_status));
  if (rule.legal_age) parts.push(String(rule.legal_age));
  if (rule.orderliness != null) parts.push(`order ${rule.orderliness}`);
  return parts.join(' · ');
}

function isLuckyPending(lucky: any): boolean {
  return (
    (lucky.accepted_at == null || lucky.accepted_at === '') &&
    (lucky.rejected_at == null || lucky.rejected_at === '')
  );
}

function luckyLotteryId(
  lucky: any,
  selectedLotteryId?: number | null
): number | null {
  if (selectedLotteryId != null) return selectedLotteryId;
  const fromPrize =
    lucky?.lotteryRule?.lottery_prize?.lottery_id ??
    lucky?.lottery_rule?.lottery_prize?.lottery_id ??
    lucky?.lotteryRule?.lottery_id ??
    lucky?.lottery_rule?.lottery_id;
  if (fromPrize != null) return Number(fromPrize);
  return null;
}

function luckyEditionDivisionId(lucky: any): number | null | undefined {
  return (
    lucky?.lotteryRule?.edition_division_id ??
    lucky?.lottery_rule?.edition_division_id
  );
}

async function fetchLotteryRules(
  lotteryId: number,
  editionDivisionId: number | null
): Promise<ApiEditionLotteryRule[]> {
  const res = await rulesApi.getRules({
    per_page: 100,
    filters: {
      lottery_id: lotteryId,
      ...(editionDivisionId != null
        ? { edition_division_id: editionDivisionId }
        : {}),
    },
  });
  return res.data || [];
}

function sortLotteries(lotteries: ApiEditionLottery[]): ApiEditionLottery[] {
  return [...lotteries].sort(
    (a, b) =>
      (a.display_order ?? 0) - (b.display_order ?? 0) ||
      a.id_lottery - b.id_lottery
  );
}

function prizeLuckiesHeader(line: ApiEditionLotteryPrize | any): string {
  const prizeName = line?.prize?.name;
  const sponsorName = line?.sponsor?.name;
  const qty = Number(line?.rule_prize_quantity_total ?? 0);
  if (prizeName == null || String(prizeName).trim() === '') {
    return String(qty || '');
  }
  const namePart = sponsorName
    ? `${prizeName} · ${sponsorName}`
    : String(prizeName);
  return `${namePart} × ${qty}`;
}

function prizeLineLabel(line: ApiEditionLotteryPrize | any): string {
  const prizeName =
    line?.prize?.name ||
    (line?.prize_id != null ? `Prize #${line.prize_id}` : 'prize');
  const sponsorName = line?.sponsor?.name || line?.prize?.sponsor?.name;
  return sponsorName ? `${prizeName} · ${sponsorName}` : prizeName;
}

function LotteryPicker({
  lotteries,
  lotteryId,
  onSelect,
}: {
  lotteries: ApiEditionLottery[];
  lotteryId: number | null;
  onSelect: (id: number) => void;
}) {
  const options = useMemo(
    () =>
      sortLotteries(lotteries).map(l => ({
        label: l.name?.trim() ? l.name : `Lottery #${l.id_lottery}`,
        value: l.id_lottery,
      })),
    [lotteries]
  );

  if (lotteries.length === 0) {
    return (
      <Text testID="lottery-picker-empty" className="text-sm text-gray-500">
        No lotteries for this edition.
      </Text>
    );
  }

  return (
    <View testID="lottery-picker">
      <SingleSelectDropdown
        options={options}
        selectedValue={lotteryId}
        onSelectionChange={v => onSelect(Number(v))}
        placeholder="Select lottery"
        title="Lottery"
        minWidth={240}
      />
    </View>
  );
}

function PrizesBoardView({ board }: { board: any }) {
  return (
    <View className="gap-2">
      <Text className="font-semibold text-gray-900">Prizes board</Text>
      {!board ? (
        <Text className="text-sm text-gray-500">No board data.</Text>
      ) : (board.intervals || []).length === 0 ? (
        <Text className="text-sm text-gray-500">No intervals.</Text>
      ) : (
        (board.intervals || []).map((interval: any, idx: number) => (
          <View key={idx} className="gap-1">
            <Text className="text-sm font-medium text-gray-800">
              {interval.label || `Interval ${idx + 1}`}
            </Text>
            {(interval.prizes || []).map((p: any, pIdx: number) => (
              <Text key={pIdx} className="text-sm text-gray-700 pl-2">
                {prizeLineLabel(p)} — qty {p.interval_quantity ?? '—'} — luckies{' '}
                {(p.luckies || []).length}
              </Text>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function EditionLotteryPrizesMode({
  editionId,
  lotteryId,
  editionFinalized,
}: {
  editionId: number;
  lotteryId: number;
  editionFinalized: boolean;
}) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const linesQuery = useQuery({
    queryKey: queryKeys.editionLotteryPrizes(lotteryId),
    queryFn: async () => {
      const res = await lotteryPrizesApi.getLotteryPrizes({
        per_page: 100,
        filters: { lottery_id: lotteryId },
        sort_by: { display_order: 'asc' },
      });
      return res.data || [];
    },
  });

  const boardQuery = useQuery({
    queryKey: queryKeys.lotteryPrizesBoard(lotteryId),
    queryFn: async () => {
      const res = await lotteryLiveApi.prizesBoard(lotteryId);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => lotteriesApi.deleteLottery(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.editionLotteries(editionId),
      });
    },
  });

  const onDelete = () => {
    if (editionFinalized) return;
    confirmAction(
      'Delete lottery',
      `Delete lottery #${lotteryId}?`,
      async () => {
        setActionError(null);
        try {
          await deleteMutation.mutateAsync(lotteryId);
        } catch (e: any) {
          setActionError(e?.message || 'Delete failed');
        }
      }
    );
  };

  const lines = linesQuery.data || [];

  return (
    <View className="gap-3">
      <LotteryDeepLinks mode="prizes" lotteryId={lotteryId} />
      <View className="bg-white border border-gray-200 rounded-lg p-3 gap-2">
        <Text className="font-semibold text-gray-900">Edition lotteries</Text>
        <Text className="text-xs text-gray-500">
          Edition #{editionId} · prizes are edition-scoped (division filter ignored).
        </Text>
        <Pressable
          testID="lottery-delete-lottery"
          disabled={editionFinalized || deleteMutation.isPending}
          onPress={onDelete}
          className={`self-start px-3 py-2 rounded-lg ${
            editionFinalized ? 'bg-gray-300' : 'bg-red-600'
          }`}
        >
          <Text className="text-white text-sm">Delete lottery</Text>
        </Pressable>
        {actionError && (
          <Text className="text-sm text-red-600">{actionError}</Text>
        )}
      </View>
      <View className="bg-white border border-gray-200 rounded-lg p-3 gap-2">
        <Text className="font-semibold text-gray-900">Prize lines</Text>
        {linesQuery.isLoading ? (
          <ActivityIndicator />
        ) : lines.length === 0 ? (
          <Text className="text-sm text-gray-500">
            No prize lines for this lottery.
          </Text>
        ) : (
          lines.map(line => (
            <View
              key={line.id_lottery_prize}
              testID={`lottery-prize-line-${line.id_lottery_prize}`}
              className="flex-row items-center gap-2 py-1"
            >
              <Text className="text-sm text-gray-800 flex-1">
                {prizeLineLabel(line)} — qty {line.prize_quantity}
              </Text>
              <DeepLinkButton
                testID={`lottery-edit-prize-line-${line.id_lottery_prize}`}
                label="Edit"
                href={`/edition-lottery-prizes/${line.id_lottery_prize}`}
              />
            </View>
          ))
        )}
      </View>
      {boardQuery.isLoading ? (
        <ActivityIndicator />
      ) : boardQuery.error ? (
        <Text className="text-sm text-red-600">
          {(boardQuery.error as Error).message || 'Prizes board failed'}
        </Text>
      ) : (
        <PrizesBoardView board={boardQuery.data} />
      )}
    </View>
  );
}

function EditionLotteryRulesMode({
  editionId,
  editionDivisionId,
  lotteryId,
  divisions,
  editionFinalized,
}: {
  editionId: number;
  editionDivisionId: number | null;
  lotteryId: number;
  divisions: ApiEditionDivision[];
  editionFinalized: boolean;
}) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const rulesQuery = useQuery({
    queryKey: queryKeys.editionLotteryRules(
      editionId,
      editionDivisionId,
      lotteryId
    ),
    queryFn: () => fetchLotteryRules(lotteryId, editionDivisionId),
  });

  const grouped = useMemo(() => {
    const rules = rulesQuery.data || [];
    if (editionDivisionId != null) {
      return [{ key: editionDivisionId, rules }];
    }
    const map = new Map<number | 'general', ApiEditionLotteryRule[]>();
    for (const rule of rules) {
      const key =
        rule.edition_division_id == null ? 'general' : rule.edition_division_id;
      const list = map.get(key) || [];
      list.push(rule);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === 'general') return -1;
        if (b === 'general') return 1;
        return Number(a) - Number(b);
      })
      .map(([key, groupRules]) => ({
        key: key === 'general' ? null : (key as number),
        rules: groupRules.sort(
          (a, b) =>
            (a.orderliness ?? 0) - (b.orderliness ?? 0) ||
            a.id_lottery_rule - b.id_lottery_rule
        ),
      }));
  }, [rulesQuery.data, editionDivisionId]);

  const onDelete = (rule: ApiEditionLotteryRule) => {
    if (editionFinalized) return;
    confirmAction(
      'Delete rule',
      `Delete rule #${rule.id_lottery_rule}?`,
      async () => {
        setDeletingId(rule.id_lottery_rule);
        setActionError(null);
        try {
          await rulesApi.deleteRule(rule.id_lottery_rule);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.editionLotteryRules(
              editionId,
              editionDivisionId,
              lotteryId
            ),
          });
        } catch (e: any) {
          setActionError(e?.message || 'Delete failed');
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  if (rulesQuery.isLoading) return <ActivityIndicator />;

  if (rulesQuery.error) {
    return (
      <Text className="text-sm text-red-600">
        {(rulesQuery.error as Error).message || 'Failed to load rules'}
      </Text>
    );
  }

  const totalRules = (rulesQuery.data || []).length;
  const firstRuleId = rulesQuery.data?.[0]?.id_lottery_rule ?? null;

  return (
    <View className="gap-3">
      <LotteryDeepLinks mode="rules" ruleId={firstRuleId} />
      {actionError && (
        <Text className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {actionError}
        </Text>
      )}
      {totalRules === 0 ? (
        <Text className="text-sm text-gray-500">
          {editionDivisionId != null
            ? 'No lottery rules for this edition division.'
            : 'No lottery rules for this edition.'}
        </Text>
      ) : (
        grouped.map(group => (
          <View
            key={group.key ?? 'general'}
            className="bg-white border border-gray-200 rounded-lg p-3"
          >
            {editionDivisionId == null && (
              <Text className="font-semibold text-gray-900 mb-2">
                {divisionLabel(group.key, divisions)}
              </Text>
            )}
            {group.rules.map(rule => (
              <View
                key={rule.id_lottery_rule}
                testID={`lottery-rule-row-${rule.id_lottery_rule}`}
                className="py-2 border-b border-gray-100 last:border-b-0 flex-row items-start gap-2"
              >
                <View className="flex-1 min-w-0">
                  <Text className="text-sm text-gray-800">
                    Rule #{rule.id_lottery_rule}
                    {rule.lottery_prize?.prize?.name
                      ? ` · ${prizeLineLabel(rule.lottery_prize)}`
                      : ''}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {ruleSummary(rule)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2 shrink-0">
                  <DeepLinkButton
                    testID={`lottery-edit-rule-${rule.id_lottery_rule}`}
                    label="Edit"
                    href={`/edition-lottery-rules/${rule.id_lottery_rule}`}
                  />
                  <Pressable
                    testID={`lottery-delete-rule-${rule.id_lottery_rule}`}
                    disabled={
                      editionFinalized || deletingId === rule.id_lottery_rule
                    }
                    onPress={() => onDelete(rule)}
                    className={`px-3 py-2 rounded-lg ${
                      editionFinalized ? 'bg-gray-300' : 'bg-red-600'
                    }`}
                  >
                    <Text className="text-white text-sm">Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function LuckyPdfAvatar({
  luckyId,
  avatarUrl,
  disabled,
  spinning,
  errorReason,
  onReload,
}: {
  luckyId: number;
  avatarUrl: string | null;
  disabled: boolean;
  spinning: boolean;
  errorReason: string | null;
  onReload: () => void;
}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinning, spin]);

  if (avatarUrl) {
    return (
      <Image
        testID={`lucky-avatar-present-${luckyId}`}
        source={{ uri: avatarUrl }}
        style={{ width: 36, height: 36, borderRadius: 18 }}
      />
    );
  }

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="items-center" style={{ width: 36 }}>
      <Pressable
        testID={`lucky-avatar-reload-${luckyId}`}
        disabled={disabled || spinning}
        onPress={onReload}
        accessibilityState={{ disabled: disabled || spinning }}
        className="items-center justify-center"
        style={{ width: 36, height: 36, opacity: disabled ? 0.4 : 1 }}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="refresh" size={22} color="#4b5563" />
        </Animated.View>
      </Pressable>
      {errorReason ? (
        <Text
          testID={`lucky-avatar-error-${luckyId}`}
          className="text-[10px] text-red-600 text-center mt-0.5"
          numberOfLines={3}
        >
          {errorReason}
        </Text>
      ) : null}
    </View>
  );
}

function EditionLotteryLuckiesMode({
  editionId,
  editionDivisionId,
  lotteryId,
  divisions,
  editionFinalized,
}: {
  editionId: number;
  editionDivisionId: number | null;
  lotteryId: number;
  divisions: ApiEditionDivision[];
  editionFinalized: boolean;
}) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [actingAction, setActingAction] = useState<'accept' | 'reject' | null>(
    null
  );
  const [infoOpenId, setInfoOpenId] = useState<number | null>(null);
  const [avatarOverrides, setAvatarOverrides] = useState<Record<number, string>>(
    {}
  );
  const [avatarDisabled, setAvatarDisabled] = useState<Record<number, string>>(
    {}
  );
  const [avatarSpinning, setAvatarSpinning] = useState<Record<number, boolean>>(
    {}
  );
  const [avatarErrors, setAvatarErrors] = useState<Record<number, string>>({});
  const [nowTick, setNowTick] = useState(() => Date.now());

  const prizesQuery = useQuery({
    queryKey: queryKeys.editionLotteryPrizesWithLuckies(
      editionId,
      editionDivisionId,
      lotteryId
    ),
    queryFn: async () => {
      const res = await lotteryPrizesApi.getLotteryPrizes({
        per_page: 100,
        include: 'luckies',
        edition_division_id: editionDivisionId,
        filters: { lottery_id: lotteryId },
        sort_by: { display_order: 'asc' },
      });
      return res;
    },
  });

  const prizeLines = prizesQuery.data?.data || [];
  const hasUnresolved = Boolean(
    prizesQuery.data?.meta?.has_unresolved_pending
  );
  const shouldPoll = !editionFinalized && hasUnresolved;

  useEffect(() => {
    if (!shouldPoll) return;
    const id = setInterval(() => {
      void prizesQuery.refetch();
    }, 30_000);
    return () => clearInterval(id);
  }, [shouldPoll, prizesQuery.refetch]);

  useEffect(() => {
    if (!shouldPoll) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shouldPoll]);

  const invalidateLuckiesBoard = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.editionLotteryPrizesWithLuckies(
        editionId,
        editionDivisionId,
        lotteryId
      ),
    });
  };

  const decideMutation = useMutation({
    mutationFn: async ({
      action,
      lotteryId,
      idLucky,
    }: {
      action: 'accept' | 'reject';
      lotteryId: number;
      idLucky: number;
    }) => {
      if (action === 'accept') {
        return lotteryLiveApi.accept(lotteryId, idLucky);
      }
      return lotteryLiveApi.reject(lotteryId, idLucky);
    },
    onSuccess: () => {
      invalidateLuckiesBoard();
    },
  });

  const onDecide = (action: 'accept' | 'reject', lucky: any) => {
    if (editionFinalized) return;
    const lotteryIdForLucky = luckyLotteryId(lucky, lotteryId);
    if (!lotteryIdForLucky) {
      setActionError('Could not resolve lottery for this lucky.');
      return;
    }
    confirmAction(
      action === 'accept' ? 'Accept prize' : 'Reject prize',
      action === 'accept'
        ? 'Accept this lucky prize?'
        : 'Reject this lucky prize?',
      async () => {
        setActingId(lucky.id_lucky);
        setActingAction(action);
        setActionError(null);
        try {
          await decideMutation.mutateAsync({
            action,
            lotteryId: lotteryIdForLucky,
            idLucky: lucky.id_lucky,
          });
        } catch (e: any) {
          setActionError(e?.message || `${action} failed`);
        } finally {
          setActingId(null);
          setActingAction(null);
        }
      }
    );
  };

  const onReloadAvatar = async (lucky: any) => {
    const idLucky = Number(lucky.id_lucky);
    if (avatarDisabled[idLucky] || avatarSpinning[idLucky]) return;

    const participation =
      lucky.drawn_participation || lucky.drawnParticipation;
    const playerId = Number(
      participation?.player_id ??
        participation?.player?.id_player ??
        participation?.player?.player_id
    );
    if (!Number.isFinite(playerId)) {
      setAvatarErrors(prev => ({
        ...prev,
        [idLucky]: 'Missing player for avatar.',
      }));
      return;
    }
    const collecting = Boolean(participation?.is_collecting_points ?? false);

    setAvatarSpinning(prev => ({ ...prev, [idLucky]: true }));
    setAvatarErrors(prev => {
      const next = { ...prev };
      delete next[idLucky];
      return next;
    });

    try {
      const res = await playersApi.generatePdfAvatar(playerId, collecting);
      const url = res?.data?.pdf_avatar_url ?? null;
      if (url) {
        setAvatarOverrides(prev => ({ ...prev, [idLucky]: url }));
      } else {
        setAvatarErrors(prev => ({
          ...prev,
          [idLucky]: 'Avatar URL missing in response.',
        }));
      }
    } catch (e: any) {
      const message = e?.message || 'Failed to generate avatar.';
      const isMissingProfile =
        e instanceof ApiError &&
        e.status === 422 &&
        (e.code === 'missing_profile_image' ||
          /missing a profile image/i.test(message) ||
          /profile image file is missing/i.test(message));
      if (isMissingProfile) {
        setAvatarDisabled(prev => ({
          ...prev,
          [idLucky]: message,
        }));
        setAvatarErrors(prev => ({ ...prev, [idLucky]: message }));
      } else {
        setAvatarErrors(prev => ({ ...prev, [idLucky]: message }));
      }
    } finally {
      setAvatarSpinning(prev => {
        const next = { ...prev };
        delete next[idLucky];
        return next;
      });
    }
  };

  const luckyGroups = prizeLines.map(line => ({
    prizeId: line.id_lottery_prize,
    items: Array.isArray(line.luckies) ? line.luckies : [],
    header: prizeLuckiesHeader(line),
  }));

  if (prizesQuery.isLoading) {
    return <ActivityIndicator />;
  }

  const lastRefreshLabel =
    shouldPoll && prizesQuery.dataUpdatedAt
      ? formatLastRefreshRelative(prizesQuery.dataUpdatedAt, nowTick)
      : null;

  return (
    <View className="gap-3" testID="lottery-luckies-board">
      {actionError && (
        <Text className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {actionError}
        </Text>
      )}
      {lastRefreshLabel ? (
        <Text testID="lottery-luckies-last-refresh" className="text-xs text-gray-500">
          {lastRefreshLabel}
        </Text>
      ) : null}
      {prizeLines.length === 0 ? (
        <Text className="text-sm text-gray-500">
          No lottery prizes for this edition.
        </Text>
      ) : (
        luckyGroups.map(group => (
          <View
            key={`lucky-group-${group.prizeId}`}
            testID={`lucky-group-${group.prizeId}`}
            className="gap-2"
          >
            <Text
              testID={`lucky-group-header-${group.prizeId}`}
              className="text-sm font-semibold text-gray-900"
            >
              {group.header}
            </Text>
            <View
              testID={`lucky-group-cards-${group.prizeId}`}
              className="flex-row flex-wrap gap-2"
            >
              {group.items.map((lucky: any) => {
                const pending = isLuckyPending(lucky);
                const edId = luckyEditionDivisionId(lucky);
                const divisionPart =
                  edId != null ? divisionLabel(edId, divisions) : 'General';
                const name =
                  lucky.short_name ||
                  playerLabelFromParticipation(
                    lucky.drawn_participation || lucky
                  );
                const primary = primaryLuckyLifecycle(lucky);
                const rows = luckyLifecycleRows(lucky);
                const idLucky = Number(lucky.id_lucky);
                const avatarUrl =
                  avatarOverrides[idLucky] ??
                  (lucky.pdf_avatar_url as string | null);
                const infoOpen = infoOpenId === lucky.id_lucky;
                const rejected = lucky.rejected_at != null;
                const phones = pending ? phoneNumbersFromLucky(lucky) : [];
                return (
                  <View
                    key={lucky.id_lucky}
                    testID={`lottery-lucky-card-${lucky.id_lucky}`}
                    className="bg-white border border-gray-200 rounded-lg p-3"
                    style={{
                      width: 280,
                      maxWidth: '100%',
                      opacity: rejected ? 0.5 : 1,
                    }}
                  >
                    <View className="flex-row items-center gap-2">
                      <LuckyPdfAvatar
                        luckyId={idLucky}
                        avatarUrl={avatarUrl}
                        disabled={Boolean(avatarDisabled[idLucky])}
                        spinning={Boolean(avatarSpinning[idLucky])}
                        errorReason={
                          avatarDisabled[idLucky] ||
                          avatarErrors[idLucky] ||
                          null
                        }
                        onReload={() => onReloadAvatar(lucky)}
                      />
                      <View className="flex-1 min-w-0">
                        <Text
                          testID={`lucky-header-${lucky.id_lucky}`}
                          className="text-sm font-medium text-gray-900"
                        >
                          Lucky #{lucky.id_lucky} · {divisionPart}
                        </Text>
                        <Text
                          testID={`lucky-name-${lucky.id_lucky}`}
                          className="text-sm text-gray-700"
                        >
                          {name}
                        </Text>
                      </View>
                      <Pressable
                        testID={`lucky-info-${lucky.id_lucky}`}
                        onPress={() =>
                          setInfoOpenId(infoOpen ? null : lucky.id_lucky)
                        }
                        className="px-2 py-1 rounded border border-gray-300"
                      >
                        <Text className="text-xs text-gray-600">Info</Text>
                      </Pressable>
                    </View>
                    {pending ? (
                      <View
                        testID={`lucky-phones-${lucky.id_lucky}`}
                        className="mt-2"
                      >
                        {phones.length > 0 ? (
                          phones.map((phone, idx) => (
                            <View
                              key={`${lucky.id_lucky}-phone-${idx}`}
                              className="flex-row items-center gap-1"
                            >
                              <View
                                testID={`lucky-phone-icon-${lucky.id_lucky}-${idx}`}
                              >
                                <Ionicons
                                  name="call-outline"
                                  size={14}
                                  color="#4b5563"
                                />
                              </View>
                              <Text
                                testID={`lucky-phone-${lucky.id_lucky}-${idx}`}
                                className="text-xs text-gray-600"
                              >
                                {phone}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text
                            testID={`lucky-phone-empty-${lucky.id_lucky}`}
                            className="text-xs text-gray-500"
                          >
                            No phone
                          </Text>
                        )}
                      </View>
                    ) : null}
                    {(() => {
                      const notAnnounced =
                        lucky.announced_at == null || lucky.announced_at === '';
                      const announceCd =
                        pending && notAnnounced
                          ? formatAnnounceCountdown(lucky.available_at, nowTick)
                          : null;
                      if (announceCd != null) {
                        return (
                          <Text
                            testID={`lucky-primary-ts-${lucky.id_lucky}`}
                            className="text-xs text-gray-500 mt-2"
                          >
                            Announcing in{' '}
                            <Text className="font-semibold">{announceCd}</Text>
                          </Text>
                        );
                      }
                      if (primary) {
                        return (
                          <Text
                            testID={`lucky-primary-ts-${lucky.id_lucky}`}
                            className="text-xs text-gray-500 mt-2"
                          >
                            {primary.label}{' '}
                            {formatLotteryTimestamp(primary.value)}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                    {infoOpen ? (
                      <View
                        testID={`lucky-info-popover-${lucky.id_lucky}`}
                        className="mt-2 gap-1 border border-gray-100 rounded-lg p-2 bg-gray-50"
                      >
                        {rows.map(row => (
                          <Text
                            key={row.key}
                            testID={`lucky-ts-${lucky.id_lucky}-${row.key}`}
                            className="text-xs text-gray-600"
                          >
                            {row.label}: {row.display}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {pending ? (
                      <View className="flex-row flex-wrap gap-2 mt-2">
                        {(() => {
                          const isActing = actingId === lucky.id_lucky;
                          const grayButtons = editionFinalized || isActing;
                          return (
                            <>
                              <Pressable
                                testID={`lottery-accept-lucky-${lucky.id_lucky}`}
                                disabled={grayButtons}
                                onPress={() => onDecide('accept', lucky)}
                                className={`px-3 py-2 rounded-lg ${
                                  grayButtons ? 'bg-gray-300' : 'bg-green-600'
                                }`}
                              >
                                <Text className="text-white text-sm">
                                  {isActing && actingAction === 'accept'
                                    ? 'Accept...'
                                    : 'Accept'}
                                </Text>
                              </Pressable>
                              <Pressable
                                testID={`lottery-reject-lucky-${lucky.id_lucky}`}
                                disabled={grayButtons}
                                onPress={() => onDecide('reject', lucky)}
                                className={`px-3 py-2 rounded-lg ${
                                  grayButtons ? 'bg-gray-300' : 'bg-red-600'
                                }`}
                              >
                                <Text className="text-white text-sm">
                                  {isActing && actingAction === 'reject'
                                    ? 'Reject...'
                                    : 'Reject'}
                                </Text>
                              </Pressable>
                            </>
                          );
                        })()}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export default function EditionLotteryTab({
  editionId,
  editionDivisionId = null,
  mode,
  divisions = [],
  editionFinalized = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const localParams = useLocalSearchParams<{ lottery?: string; ed?: string }>();
  const globalParams = useGlobalSearchParams<{ lottery?: string; ed?: string }>();
  const lotteryParam = globalParams.lottery ?? localParams.lottery;
  const edParam = globalParams.ed ?? localParams.ed;

  const lotteriesQuery = useQuery({
    queryKey: queryKeys.editionLotteries(editionId),
    queryFn: async () => {
      const res = await lotteriesApi.getLotteries({
        per_page: 50,
        filters: { edition_id: editionId },
        sort_by: { display_order: 'asc' },
      });
      return res.data || [];
    },
    enabled: Number.isFinite(editionId),
  });

  const lotteries = sortLotteries(lotteriesQuery.data || []);
  const lotteriesLoaded = !lotteriesQuery.isLoading && !!lotteriesQuery.data;
  const selectedLotteryId = lotteriesLoaded
    ? parseLotteryId(
        lotteryParam,
        lotteries.map(l => l.id_lottery)
      )
    : parseLotteryId(lotteryParam);

  const edKeep = parseLotteryId(edParam);

  const onSelectLottery = (id: number) => {
    router.replace(
      withLotteryQuery(withEdQuery(pathname, edKeep), id) as any
    );
  };

  return (
    <View className="gap-3">
      {editionFinalized && (
        <Text
          testID="lottery-finalized-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2"
        >
          Edition is finalized — in-tab Accept / Reject are read-only. Sidebar
          CRUD remains available.
        </Text>
      )}

      <View className="bg-white border border-gray-200 rounded-lg p-3 gap-2">
        <Text className="font-semibold text-gray-900">Lottery</Text>
        {lotteriesQuery.isLoading && lotteries.length === 0 ? (
          <ActivityIndicator />
        ) : (
          <LotteryPicker
            lotteries={lotteries}
            lotteryId={selectedLotteryId}
            onSelect={onSelectLottery}
          />
        )}
      </View>

      {selectedLotteryId == null ? (
        lotteries.length > 0 ? (
          <Text testID="lottery-select-empty" className="text-sm text-gray-500">
            Select a lottery to view prizes, rules, and luckies.
          </Text>
        ) : null
      ) : (
        <>
          {mode === 'prizes' && (
            <EditionLotteryPrizesMode
              editionId={editionId}
              lotteryId={selectedLotteryId}
              editionFinalized={editionFinalized}
            />
          )}

          {mode === 'rules' && (
            <EditionLotteryRulesMode
              editionId={editionId}
              editionDivisionId={editionDivisionId}
              lotteryId={selectedLotteryId}
              divisions={divisions}
              editionFinalized={editionFinalized}
            />
          )}

          {mode === 'luckies' && (
            <EditionLotteryLuckiesMode
              editionId={editionId}
              editionDivisionId={editionDivisionId}
              lotteryId={selectedLotteryId}
              divisions={divisions}
              editionFinalized={editionFinalized}
            />
          )}
        </>
      )}
    </View>
  );
}
