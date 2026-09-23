/**
 * ED Matches board: local-draft reorder (arrows + DnD), filter chips, Save chrome.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import CachedPdfImageReload from '@/components/editions/CachedPdfImageReload';
import { useCachedPdfAvatarReload } from '@/hooks/useCachedPdfAvatarReload';
import { queryKeys } from '@/lib/queryClient';
import { scheduleApi } from '@/services/api/scheduleApi';
import {
  GameMatch,
  ScheduleBoardMetrics,
  SchedulePlayerBoardRow,
  ScheduleState,
} from '@/types/api/edition';
import { formatPlayerDisplayName } from '@/utils/edition/matchPlayerLabels';
import { clockHi } from '@/utils/edition/clockHi';
import { isGenerateBlocked } from '@/utils/edition/schedulePreview';
import {
  applyCourtPermutation,
  completeRoundCount,
  courtIdOf,
  diffMovedAndAffected,
  isSparseMatch,
  swapCompleteRound,
} from '@/utils/edition/scheduleMatchesReorder';
import { confirmDiscardDirty } from '@/utils/softDirtyNav';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import SortableRow from './SortableRow';

export { completeRoundCount, isSparseMatch };

type Props = {
  editionDivisionId: number;
  state: ScheduleState;
  onRefresh?: () => Promise<void>;
};

const ROW_HEIGHT = 72;

const HIGHLIGHT_STYLE = {
  backgroundColor: '#fffbeb',
  borderLeftWidth: 4,
  borderLeftColor: '#f59e0b',
} as const;
const MOVED_STYLE = {
  backgroundColor: '#dbeafe',
  borderLeftWidth: 4,
  borderLeftColor: '#3b82f6',
} as const;
const AFFECTED_STYLE = {
  backgroundColor: '#ede9fe',
  borderLeftWidth: 4,
  borderLeftColor: '#8b5cf6',
} as const;

function matchRowChromeStyle(opts: {
  highlighted: boolean;
  moved: boolean;
  affected: boolean;
}) {
  if (opts.highlighted) return HIGHLIGHT_STYLE;
  if (opts.moved) return MOVED_STYLE;
  if (opts.affected) return AFFECTED_STYLE;
  return undefined;
}

function matchHasParticipation(m: GameMatch, participationId: number): boolean {
  return (m.sides || []).some(side =>
    (side.players || []).some(
      p => Number(p.participation_id) === participationId
    )
  );
}

function distributionTextClass(cssClass?: string | null): string {
  switch (cssClass) {
    case 'excellent':
      return 'text-emerald-700';
    case 'good':
      return 'text-green-600';
    case 'fair':
      return 'text-orange-600';
    case 'poor':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

function SortableMatchRow({
  index,
  count,
  locked,
  onReorder,
  children,
}: {
  index: number;
  count: number;
  locked: boolean;
  onReorder: (from: number, to: number) => void;
  children: React.ReactNode;
}) {
  return (
    <SortableRow
      index={index}
      count={count}
      locked={locked}
      rowHeight={ROW_HEIGHT}
      onReorder={onReorder}
    >
      {children}
    </SortableRow>
  );
}

export default function EditionScheduleMatchesBoard({
  editionDivisionId,
  state,
  onRefresh,
}: Props) {
  const queryClient = useQueryClient();
  const [highlightParticipationId, setHighlightParticipationId] = useState<
    number | 'all'
  >('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftMatches, setDraftMatches] = useState<GameMatch[]>([]);
  const [touchedIds, setTouchedIds] = useState<Set<number>>(() => new Set());
  const [lastTouchCourt, setLastTouchCourt] = useState<number | null>(null);
  const {
    spinning: avatarSpinning,
    errors: avatarErrors,
    urlFor: avatarUrlFor,
    reload: reloadAvatarState,
  } = useCachedPdfAvatarReload();

  const generateBlocked = isGenerateBlocked(state);
  const metrics = state.board_metrics ?? null;
  const playersBoard = state.players_board || [];
  const boardByParticipation = useMemo(() => {
    const map = new Map<number, SchedulePlayerBoardRow>();
    for (const row of playersBoard) {
      map.set(Number(row.participation_id), row);
    }
    return map;
  }, [playersBoard]);

  const participationById = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of Array.isArray(state.participations)
      ? state.participations
      : []) {
      map.set(Number(p?.id_participation), p);
    }
    return map;
  }, [state.participations]);

  const baselineRegular = useMemo(
    () =>
      (state.matches || []).filter(
        m => m.match_kind === 'REGULAR' || m.match_kind == null
      ),
    [state.matches]
  );

  const baselineKey = useMemo(
    () =>
      baselineRegular
        .map(
          m =>
            `${m.id_match}:${m.sequence_no}:${m.scheduled_start}:${m.scheduled_end}`
        )
        .join('|'),
    [baselineRegular]
  );

  const dirty = useMemo(() => {
    if (draftMatches.length === 0) return false;
    const draftKey = draftMatches
      .map(m => `${m.id_match}:${m.sequence_no}`)
      .join('|');
    const baseKey = baselineRegular
      .map(m => `${m.id_match}:${m.sequence_no}`)
      .join('|');
    return draftKey !== baseKey;
  }, [draftMatches, baselineRegular]);

  useEffect(() => {
    if (dirty) return;
    setDraftMatches(baselineRegular.map(m => ({ ...m })));
    setTouchedIds(new Set());
    setLastTouchCourt(null);
  }, [baselineKey, dirty, baselineRegular]);

  const matches = draftMatches.length > 0 ? draftMatches : baselineRegular;
  const completeCount = completeRoundCount(matches);

  const { movedIds, affectedIds } = useMemo(
    () => diffMovedAndAffected(baselineRegular, matches, touchedIds),
    [baselineRegular, matches, touchedIds]
  );

  const matchesByCourt = useMemo(() => {
    const map = new Map<
      string,
      { courtKey: string; courtId: number; list: GameMatch[] }
    >();
    for (const m of matches) {
      const courtId = courtIdOf(m);
      const courtKey =
        m.edition_division_court?.court?.name ||
        (courtId > 0 ? `Court #${courtId}` : 'Unassigned');
      const key = `${courtId}:${courtKey}`;
      if (!map.has(key)) {
        map.set(key, { courtKey, courtId, list: [] });
      }
      map.get(key)!.list.push(m);
    }
    for (const entry of map.values()) {
      entry.list.sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0));
    }
    return Array.from(map.values());
  }, [matches]);

  const filterRows = useMemo(() => {
    const parts = Array.isArray(state.participations)
      ? [...state.participations].sort(
          (a: any, b: any) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            (a.id_participation ?? 0) - (b.id_participation ?? 0)
        )
      : [];
    return parts;
  }, [state.participations]);

  const applyDraft = useCallback(
    (
      nextMatches: GameMatch[],
      courtId: number,
      touchedMatchId: number
    ) => {
      setDraftMatches(nextMatches);
      setLastTouchCourt(courtId);
      setTouchedIds(prev => {
        const n = new Set(prev);
        n.add(touchedMatchId);
        return n;
      });
      setError(null);
    },
    []
  );

  const moveCompleteRound = (courtId: number, matchId: number, direction: -1 | 1) => {
    if (generateBlocked || courtId < 1) return;
    const result = swapCompleteRound(matches, courtId, matchId, direction);
    if (!result) return;
    applyDraft(result.matches, courtId, matchId);
  };

  const reorderCompleteOnCourt = (
    courtId: number,
    fromIndex: number,
    toIndex: number
  ) => {
    if (generateBlocked || courtId < 1) return;
    const complete = matches
      .filter(
        m =>
          courtIdOf(m) === courtId && (m.sequence_no ?? 0) <= completeCount
      )
      .sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0));
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= complete.length ||
      toIndex >= complete.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const next = [...complete];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    const ids = next.map(m => m.id_match);
    const applied = applyCourtPermutation(matches, courtId, ids);
    applyDraft(applied, courtId, item.id_match);
  };

  const cancel = useCallback(() => {
    setDraftMatches(baselineRegular.map(m => ({ ...m })));
    setTouchedIds(new Set());
    setLastTouchCourt(null);
    setError(null);
  }, [baselineRegular]);

  const save = useCallback(async () => {
    if (generateBlocked || !dirty || lastTouchCourt == null) return;
    const completeIds = matches
      .filter(
        m =>
          courtIdOf(m) === lastTouchCourt &&
          (m.sequence_no ?? 0) <= completeCount
      )
      .sort((a, b) => (a.sequence_no ?? 0) - (b.sequence_no ?? 0))
      .map(m => m.id_match);
    setSaving(true);
    setError(null);
    try {
      const res = await scheduleApi.reorderMatches(editionDivisionId, {
        court: lastTouchCourt,
        match_ids: completeIds,
      });
      const prev = queryClient.getQueryData<ScheduleState>([
        ...queryKeys.schedule(editionDivisionId),
        'board',
      ]);
      const nextMatches = res.data?.matches ?? prev?.matches;
      const nextMetrics = res.data?.board_metrics ?? prev?.board_metrics;
      queryClient.setQueryData(
        [...queryKeys.schedule(editionDivisionId), 'board'],
        {
          ...(prev || state),
          matches: nextMatches,
          board_metrics: nextMetrics,
        }
      );
      setDraftMatches(
        (nextMatches || [])
          .filter(m => m.match_kind === 'REGULAR' || m.match_kind == null)
          .map(m => ({ ...m }))
      );
      setTouchedIds(new Set());
      setLastTouchCourt(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.schedule(editionDivisionId),
      });
    } catch (e: any) {
      setError(e?.message || 'Reorder failed');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [
    completeCount,
    dirty,
    editionDivisionId,
    generateBlocked,
    lastTouchCourt,
    matches,
    queryClient,
    state,
  ]);

  const refresh = useCallback(async () => {
    if (dirty) {
      const ok = await confirmDiscardDirty();
      if (!ok) return;
      cancel();
    }
    if (onRefresh) await onRefresh();
    else {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.schedule(editionDivisionId),
      });
    }
  }, [cancel, dirty, editionDivisionId, onRefresh, queryClient]);

  useRegisterPageActions({
    save,
    cancel,
    refresh,
    canSave: !generateBlocked && dirty && lastTouchCourt != null,
    isDirty: dirty,
    isSaving: saving,
  });

  const reloadAvatar = async (participationId: number) => {
    const row = boardByParticipation.get(participationId);
    const participation = participationById.get(participationId);
    const playerId = Number(
      row?.player_id ??
        participation?.player_id ??
        participation?.player?.id_player
    );
    const collecting = Boolean(
      row?.is_collecting_points ?? participation?.is_collecting_points ?? false
    );
    await reloadAvatarState({
      key: participationId,
      playerId,
      collecting,
    });
  };

  const avatarForParticipation = (participationId: number, size = 28) => {
    const row = boardByParticipation.get(participationId);
    const url = avatarUrlFor(participationId, row?.pdf_avatar_url ?? null);
    return (
      <CachedPdfImageReload
        testIdPrefix={`avatar-${participationId}`}
        imageUrl={url}
        size={size}
        spinning={Boolean(avatarSpinning[participationId])}
        errorReason={avatarErrors[participationId] || null}
        onReload={() => void reloadAvatar(participationId)}
      />
    );
  };

  const playerChipStats = (participation: any) => {
    const pid = Number(participation.id_participation);
    const row = boardByParticipation.get(pid);
    const playerId = row?.player_id ?? participation.player_id;
    const met =
      playerId != null
        ? metrics?.players_met?.[playerId] ??
          metrics?.players_met?.[String(playerId)]
        : undefined;
    const meetingCount = met ? Object.keys(met).length : null;
    const dist =
      playerId != null
        ? metrics?.playing_distribution?.per_player?.[playerId] ??
          metrics?.playing_distribution?.per_player?.[String(playerId)]
        : undefined;
    const partners =
      playerId != null
        ? metrics?.partners_count?.[playerId] ??
          metrics?.partners_count?.[String(playerId)]
        : undefined;
    return {
      meetingCount,
      percentage: dist?.percentage,
      cssClass: dist?.css_class,
      partners,
    };
  };

  const renderSide = (m: GameMatch, side: 'LEFT' | 'RIGHT') => {
    const found = (m.sides || []).find(
      s => String(s.side).toUpperCase() === side
    );
    const players = found?.players || [];
    if (players.length === 0) {
      return <Text className="text-sm text-gray-800">—</Text>;
    }
    return (
      <View
        className={`flex-row flex-wrap items-center gap-1 ${
          side === 'RIGHT' ? 'justify-end' : ''
        }`}
      >
        {players.map((mp, idx) => {
          const pid = Number(mp.participation_id);
          const name =
            formatPlayerDisplayName(mp.participation?.player) ?? '—';
          return (
            <View
              key={
                Number.isFinite(pid) && pid > 0
                  ? pid
                  : `side-${side}-${idx}`
              }
              className="flex-row items-center gap-1 mr-1"
            >
              {Number.isFinite(pid) && pid > 0
                ? avatarForParticipation(pid, 24)
                : (
                    <Text className="text-base">⚠️</Text>
                  )}
              <Text className="text-sm text-gray-800">{name}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  if (matches.length === 0) {
    return <Text className="text-sm text-gray-500">No matches yet.</Text>;
  }

  return (
    <View testID="schedule-matches-board" className="flex-row gap-3 flex-wrap">
      <View className="bg-white border border-gray-200 rounded-lg p-3 w-full max-w-xs gap-2">
        <Text className="font-semibold text-gray-900">Filter</Text>
        <Pressable
          testID="filter-all"
          onPress={() => setHighlightParticipationId('all')}
          className={`px-3 py-2 rounded-lg border ${
            highlightParticipationId === 'all'
              ? 'bg-blue-600 border-blue-600'
              : 'bg-white border-gray-300'
          }`}
        >
          <Text
            className={
              highlightParticipationId === 'all'
                ? 'text-white text-sm'
                : 'text-gray-700 text-sm'
            }
          >
            All
          </Text>
        </Pressable>
        {filterRows.map((p: any) => {
          const pid = Number(p.id_participation);
          const row = boardByParticipation.get(pid);
          const selected = highlightParticipationId === pid;
          const stats = playerChipStats(p);
          const showPartners =
            (metrics?.partners_count_variation ?? 0) > 0 &&
            stats.partners != null;
          return (
            <Pressable
              key={pid}
              testID={`filter-participation-${pid}`}
              onPress={() => setHighlightParticipationId(pid)}
              className={`px-3 py-2 rounded-lg border flex-row items-center gap-2 flex-wrap ${
                selected
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              {avatarForParticipation(pid)}
              <Text
                className={
                  selected ? 'text-white text-sm' : 'text-gray-700 text-sm'
                }
              >
                {row?.short_name ||
                  p.player?.name ||
                  `Participation #${pid}`}
              </Text>
              {stats.percentage != null ? (
                <Text
                  testID={`filter-playing-${pid}`}
                  className={`text-xs ${
                    selected
                      ? 'text-white'
                      : distributionTextClass(stats.cssClass)
                  }`}
                >
                  · {stats.percentage}%
                </Text>
              ) : null}
              {stats.cssClass ? (
                <Text
                  testID={`filter-playing-class-${pid}-${stats.cssClass}`}
                  className="hidden"
                >
                  {stats.cssClass}
                </Text>
              ) : null}
              {showPartners ? (
                <Text
                  testID={`filter-partners-${pid}`}
                  className={
                    selected ? 'text-blue-100 text-xs' : 'text-gray-500 text-xs'
                  }
                >
                  · {stats.partners} partners
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View className="flex-1 min-w-[280px] gap-3">
        {error && (
          <Text testID="matches-reorder-error" className="text-sm text-red-600">
            {error}
          </Text>
        )}
        {saving && <ActivityIndicator />}
        <Text testID="matches-count" className="text-xs text-gray-500">
          {matches.length} matches
        </Text>
        {matchesByCourt.map(({ courtKey, courtId, list }) => {
          const completeList = list.filter(
            m => (m.sequence_no ?? 0) <= completeCount
          );
          const sparseList = list.filter(
            m => (m.sequence_no ?? 0) > completeCount
          );
          return (
            <View
              key={courtKey}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <Text className="font-semibold text-gray-900 mb-2">
                {courtKey}
              </Text>
              {completeList.map((m, index) => {
                const highlighted =
                  highlightParticipationId !== 'all' &&
                  matchHasParticipation(m, Number(highlightParticipationId));
                const moved = movedIds.has(m.id_match);
                const affected = affectedIds.has(m.id_match);
                const canMove = !generateBlocked;
                const chromeStyle = matchRowChromeStyle({
                  highlighted,
                  moved,
                  affected,
                });
                const row = (
                  <View
                    testID={`match-row-${m.id_match}`}
                    className="border-b border-gray-100 py-2"
                    style={chromeStyle}
                  >
                    {moved ? (
                      <Text testID={`match-moved-${m.id_match}`} className="hidden">
                        moved
                      </Text>
                    ) : null}
                    {affected ? (
                      <Text
                        testID={`match-affected-${m.id_match}`}
                        className="hidden"
                      >
                        affected
                      </Text>
                    ) : null}
                    {canMove ? (
                      <View className="flex-row items-center justify-end mb-1">
                        <Pressable
                          testID={`match-move-up-${m.id_match}`}
                          accessibilityLabel={`Move match ${m.id_match} up`}
                          onPress={() =>
                            moveCompleteRound(courtId, m.id_match, -1)
                          }
                          className="p-1"
                        >
                          <Ionicons
                            name="arrow-up"
                            size={16}
                            color="#374151"
                          />
                        </Pressable>
                        <Pressable
                          testID={`match-move-down-${m.id_match}`}
                          accessibilityLabel={`Move match ${m.id_match} down`}
                          onPress={() =>
                            moveCompleteRound(courtId, m.id_match, 1)
                          }
                          className="p-1"
                        >
                          <Ionicons
                            name="arrow-down"
                            size={16}
                            color="#374151"
                          />
                        </Pressable>
                      </View>
                    ) : null}
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">{renderSide(m, 'LEFT')}</View>
                      <Text
                        testID={`match-start-${m.id_match}`}
                        className="text-sm font-medium text-gray-700 px-2"
                      >
                        {clockHi(m.scheduled_start)}
                      </Text>
                      <View className="flex-1">{renderSide(m, 'RIGHT')}</View>
                    </View>
                  </View>
                );
                if (!canMove) return <View key={m.id_match}>{row}</View>;
                return (
                  <SortableMatchRow
                    key={m.id_match}
                    index={index}
                    count={completeList.length}
                    locked={!canMove}
                    onReorder={(from, to) =>
                      reorderCompleteOnCourt(courtId, from, to)
                    }
                  >
                    {row}
                  </SortableMatchRow>
                );
              })}
              {sparseList.map(m => (
                <View
                  key={m.id_match}
                  testID={`match-row-${m.id_match}`}
                  className="border-b border-gray-100 py-2 opacity-80"
                >
                  <View className="flex-row items-center justify-end mb-1">
                    <Text
                      testID={`match-sparse-${m.id_match}`}
                      className="text-xs text-gray-400"
                    >
                      Fixed
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">{renderSide(m, 'LEFT')}</View>
                    <Text
                      testID={`match-start-${m.id_match}`}
                      className="text-sm font-medium text-gray-700 px-2"
                    >
                      {clockHi(m.scheduled_start)}
                    </Text>
                    <View className="flex-1">{renderSide(m, 'RIGHT')}</View>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function ScheduleBoardMetricsCards({
  metrics,
  emptyLabel = 'No matches.',
}: {
  metrics: ScheduleBoardMetrics | null | undefined;
  emptyLabel?: string;
}) {
  if (!metrics) {
    return (
      <Text testID="schedule-metrics-empty" className="text-sm text-gray-500">
        {emptyLabel}
      </Text>
    );
  }

  const identity = metrics.template_identity;
  const versionPart =
    identity?.version != null ? ` · v${identity.version}` : '';
  const avgPct = metrics.playing_distribution?.percentage ?? 0;

  return (
    <View testID="schedule-metrics-cards" className="gap-2">
      <Text testID="metric-players" className="text-sm text-gray-800">
        Players: {metrics.players_count}
      </Text>
      <Text testID="metric-matches" className="text-sm text-gray-800">
        Matches: {metrics.matches_count}
      </Text>
      <Text testID="metric-points" className="text-sm text-gray-800">
        Points/match: {metrics.points_per_match ?? '—'}
      </Text>
      <Text testID="metric-variation" className="text-sm text-gray-800">
        Partners variation: {metrics.partners_count_variation}
      </Text>
      <Text testID="metric-meeting" className="text-sm text-gray-800">
        Meeting players: {metrics.min_opponents_met}–{metrics.max_opponents_met}
      </Text>
      <Text testID="metric-distribution" className="text-sm text-gray-800">
        Min/avg playing %: {avgPct}%
      </Text>
      <Text testID="metric-template" className="text-sm text-gray-800">
        Template: {identity?.players}p / {identity?.partners} partners /{' '}
        {identity?.repeat} repeat / {identity?.courts} courts{versionPart}
      </Text>
    </View>
  );
}
