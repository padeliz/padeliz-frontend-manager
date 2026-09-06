import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import CachedPdfImageReload from '@/components/editions/CachedPdfImageReload';
import { EditionGeneralEditHint } from '@/components/editions/editionGeneralHint';
import { queryKeys } from '@/lib/queryClient';
import { cachedPdfImagesApi } from '@/services/api/cachedPdfImagesApi';
import { matchesApi } from '@/services/api/matchesApi';
import { scheduleApi } from '@/services/api/scheduleApi';
import { ApiEditionDivision } from '@/types/api/entities';
import { GameMatch, GameMatchSidePlayer, ScheduleState } from '@/types/api/edition';
import {
  buildParticipationsById,
  matchSidePlayerNames,
} from '@/utils/edition/matchPlayerLabels';
import { clockHi } from '@/utils/edition/clockHi';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppTextInput from '@/components/ui/AppTextInput';
import { ActivityIndicator, Text, View } from 'react-native';

type Props = {
  editionDivisionId: number | null;
  divisions?: ApiEditionDivision[];
};

function findSide(match: GameMatch, side: 'LEFT' | 'RIGHT') {
  return (match.sides || []).find(s => String(s.side).toUpperCase() === side);
}

function sideScore(match: GameMatch, side: 'LEFT' | 'RIGHT'): string {
  const found = findSide(match, side);
  return found?.score == null ? '' : String(found.score);
}

function sideCoupleUrl(match: GameMatch, side: 'LEFT' | 'RIGHT'): string | null {
  return findSide(match, side)?.couple_image_url ?? null;
}

function sidePlayers(
  match: GameMatch,
  side: 'LEFT' | 'RIGHT'
): GameMatchSidePlayer[] {
  return findSide(match, side)?.players || [];
}

function draftsFromMatches(list: GameMatch[]) {
  const next: Record<number, { left: string; right: string }> = {};
  list.forEach(m => {
    next[m.id_match] = {
      left: sideScore(m, 'LEFT'),
      right: sideScore(m, 'RIGHT'),
    };
  });
  return next;
}

function divisionTitle(d: ApiEditionDivision): string {
  return d.division_title || `ED #${d.id_edition_division}`;
}

function isRegular(m: GameMatch): boolean {
  return m.match_kind === 'REGULAR' || m.match_kind == null;
}

function isFinal(m: GameMatch): boolean {
  return String(m.match_kind || '').toUpperCase() === 'FINAL';
}

function isDemo(m: GameMatch): boolean {
  const k = String(m.match_kind || '').toUpperCase();
  return k === 'DEMO' || k === 'DEMONSTRATIVE';
}

/** REGULAR + FINAL only for Scores ED list. */
export function scoresVisibleMatches(matches: GameMatch[]): GameMatch[] {
  const filtered = matches.filter(m => isRegular(m) || isFinal(m));
  const finals = filtered.filter(isFinal);
  const regulars = filtered.filter(m => !isFinal(m));
  return [...finals, ...regulars];
}

export function scoresFillStats(
  matches: GameMatch[],
  includeFinal: boolean
): {
  filled: number;
  expected: number;
  missingFinal: boolean;
  hasFinalRow: boolean;
} {
  const regulars = matches.filter(isRegular);
  let filled = 0;
  let expected = 0;
  for (const m of regulars) {
    for (const side of m.sides || []) {
      expected += 1;
      if (side.score != null && String(side.score) !== '') filled += 1;
    }
  }
  const hasFinalRow = matches.some(isFinal);
  const missingFinal = includeFinal && !hasFinalRow;
  return { filled, expected, missingFinal, hasFinalRow };
}

function ScoresGeneralView({ divisions }: { divisions: ApiEditionDivision[] }) {
  const queries = useQueries({
    queries: divisions.map(d => ({
      queryKey: queryKeys.schedule(d.id_edition_division),
      queryFn: async () => {
        const res = await scheduleApi.getSchedule(d.id_edition_division);
        return res.data as ScheduleState;
      },
    })),
  });

  if (queries.some(q => q.isLoading) && queries.every(q => !q.data)) {
    return <ActivityIndicator />;
  }

  return (
    <View className="gap-4" testID="scores-general-view">
      <EditionGeneralEditHint />
      {divisions.map((d, i) => {
        const data = queries[i]?.data;
        const matches = (data?.matches || []) as GameMatch[];
        const includeFinal = !!(data?.schedule as any)?.include_final;
        const stats = scoresFillStats(matches, includeFinal);
        return (
          <View
            key={d.id_edition_division}
            testID={`scores-general-ed-${d.id_edition_division}`}
            className="bg-white border border-gray-200 rounded-lg p-3"
          >
            <Text className="font-semibold text-gray-900 mb-2">
              {divisionTitle(d)}
            </Text>
            {!data ? (
              <Text className="text-sm text-gray-500">No schedule</Text>
            ) : (
              <View className="gap-1">
                <Text
                  testID={`scores-stat-fill-${d.id_edition_division}`}
                  className="text-sm text-gray-800"
                >
                  Scores filled: {stats.filled}/{stats.expected} (REGULAR sides)
                </Text>
                {includeFinal || stats.hasFinalRow ? (
                  <Text
                    testID={`scores-stat-final-${d.id_edition_division}`}
                    className="text-sm text-gray-800"
                  >
                    {stats.hasFinalRow
                      ? 'Final match: present'
                      : 'Final match: missing'}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function EditionScoresTab({
  editionDivisionId,
  divisions = [],
}: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<number, { left: string; right: string }>
  >({});
  const [baseline, setBaseline] = useState('');
  const [coupleOverrides, setCoupleOverrides] = useState<
    Record<string, string>
  >({});
  const [coupleSpinning, setCoupleSpinning] = useState<
    Record<string, boolean>
  >({});
  const [coupleErrors, setCoupleErrors] = useState<Record<string, string>>({});

  const scheduleQuery = useQuery({
    queryKey: [...queryKeys.schedule(editionDivisionId ?? 0), 'scores'] as const,
    queryFn: async () => {
      const res = await scheduleApi.getSchedule(editionDivisionId!, {
        scores: true,
      });
      return res.data;
    },
    enabled: !!editionDivisionId,
  });

  const matches = useMemo(
    () => scoresVisibleMatches((scheduleQuery.data?.matches || []) as GameMatch[]),
    [scheduleQuery.data?.matches]
  );
  const participationsById = useMemo(
    () => buildParticipationsById(scheduleQuery.data?.participations),
    [scheduleQuery.data?.participations]
  );
  const finalized = !!scheduleQuery.data?.is_finalized;

  useEffect(() => {
    const next = draftsFromMatches(matches);
    setDrafts(next);
    setBaseline(JSON.stringify(next));
  }, [scheduleQuery.dataUpdatedAt, matches]);

  const dirty = useMemo(
    () => baseline !== '' && JSON.stringify(drafts) !== baseline,
    [baseline, drafts]
  );

  const reload = useCallback(async () => {
    await scheduleQuery.refetch({ throwOnError: true });
  }, [scheduleQuery]);

  const saveAll = useCallback(async () => {
    if (!editionDivisionId || finalized) return;
    setSaving(true);
    try {
      const changed = Object.entries(drafts).filter(([id, d]) => {
        const base = JSON.parse(baseline || '{}')[id];
        return !base || base.left !== d.left || base.right !== d.right;
      });
      for (const [id, draft] of changed) {
        await matchesApi.updateScores(Number(id), {
          left_score: Number(draft.left || 0),
          right_score: Number(draft.right || 0),
        });
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.schedule(editionDivisionId),
      });
    } finally {
      setSaving(false);
    }
  }, [baseline, drafts, editionDivisionId, finalized, queryClient]);

  const coupleReloadTargets = useCallback(
    (players: GameMatchSidePlayer[]) => {
      if (players.length !== 2) return null;
      const resolved = players.map(mp => {
        const participation: any =
          participationsById.get(Number(mp?.participation_id)) ??
          (mp as any)?.participation ??
          null;
        return {
          playerId: Number(
            mp?.player_id ??
              mp?.player?.id_player ??
              participation?.player_id ??
              participation?.player?.id_player
          ),
          collecting: Boolean(participation?.is_collecting_points ?? false),
        };
      });
      if (resolved.some(r => !Number.isFinite(r.playerId))) return null;
      return resolved;
    },
    [participationsById]
  );

  const reloadCouple = async (match: GameMatch, side: 'LEFT' | 'RIGHT') => {
    const key = `${match.id_match}-${side}`;
    if (coupleSpinning[key]) return;

    const targets = coupleReloadTargets(sidePlayers(match, side));
    if (!targets) {
      setCoupleErrors(prev => ({
        ...prev,
        [key]: 'Need two known players for a couple image.',
      }));
      return;
    }

    setCoupleSpinning(prev => ({ ...prev, [key]: true }));
    setCoupleErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const res = await cachedPdfImagesApi.generatePairImage({
        player1Id: targets[0].playerId,
        player2Id: targets[1].playerId,
        player1IsCollectingPoints: targets[0].collecting,
        player2IsCollectingPoints: targets[1].collecting,
      });
      const url = res?.data?.couple_image_url ?? null;
      if (url) {
        setCoupleOverrides(prev => ({ ...prev, [key]: url }));
      } else {
        setCoupleErrors(prev => ({
          ...prev,
          [key]: 'Couple image URL missing in response.',
        }));
      }
    } catch (e: any) {
      setCoupleErrors(prev => ({
        ...prev,
        [key]: e?.message || 'Failed to generate couple image.',
      }));
    } finally {
      setCoupleSpinning(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const renderCouple = (match: GameMatch, side: 'LEFT' | 'RIGHT') => {
    const key = `${match.id_match}-${side}`;
    const sideKey = side.toLowerCase();
    const url = coupleOverrides[key] ?? sideCoupleUrl(match, side);
    const canReload = sidePlayers(match, side).length === 2;
    if (!url && !canReload) {
      return (
        <Text testID={`couple-missing-${sideKey}-${match.id_match}`}>⚠️</Text>
      );
    }
    return (
      <CachedPdfImageReload
        testIdPrefix={`couple-${sideKey}-${match.id_match}`}
        imageUrl={url}
        borderRadius={4}
        spinning={Boolean(coupleSpinning[key])}
        errorReason={coupleErrors[key] || null}
        onReload={() => void reloadCouple(match, side)}
      />
    );
  };

  useRegisterPageActions(
    editionDivisionId
      ? {
          save: saveAll,
          refresh: reload,
          canSave: !finalized,
          isDirty: dirty,
          isSaving: saving,
        }
      : null
  );

  if (!editionDivisionId) {
    return <ScoresGeneralView divisions={divisions} />;
  }

  if (scheduleQuery.isLoading && matches.length === 0) {
    return <ActivityIndicator />;
  }

  return (
    <View className="gap-3" testID="scores-ed-view">
      {finalized && (
        <Text className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
          Schedule is finalized — scores are read-only.
        </Text>
      )}
      {matches.length === 0 ? (
        <Text className="text-sm text-gray-500">No matches yet.</Text>
      ) : (
        matches.map(m => {
          const finalRow = isFinal(m);
          return (
            <View
              key={m.id_match}
              testID={`score-match-${m.id_match}`}
              className={`bg-white border rounded-lg p-3 ${
                finalRow
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-200'
              }`}
            >
              <Text
                testID={`score-meta-${m.id_match}`}
                className="text-xs text-gray-500 mb-2"
              >
                Match #{m.id_match} · {m.match_kind || 'REGULAR'} ·{' '}
                {clockHi(m.scheduled_start)} ·{' '}
                {m.edition_division_court?.court?.name ||
                  `court ${m.edition_division_court_id ?? '—'}`}
              </Text>
              <View
                testID={`score-match-row-${m.id_match}`}
                className="flex-row flex-wrap items-center gap-2"
              >
                <Text
                  testID={`score-names-left-${m.id_match}`}
                  className="text-sm text-gray-800 flex-1"
                  style={{ minWidth: 80 }}
                >
                  {matchSidePlayerNames(m, 'LEFT', participationsById)}
                </Text>
                {renderCouple(m, 'LEFT')}
                <AppTextInput
                  testID={`score-left-${m.id_match}`}
                  editable={!finalized}
                  className="border border-gray-300 rounded px-2 py-1 text-center"
                  style={{ width: 56 }}
                  keyboardType="numeric"
                  value={drafts[m.id_match]?.left ?? ''}
                  onChangeText={v =>
                    setDrafts(prev => ({
                      ...prev,
                      [m.id_match]: {
                        left: v,
                        right: prev[m.id_match]?.right ?? '',
                      },
                    }))
                  }
                />
                <AppTextInput
                  testID={`score-right-${m.id_match}`}
                  editable={!finalized}
                  className="border border-gray-300 rounded px-2 py-1 text-center"
                  style={{ width: 56 }}
                  keyboardType="numeric"
                  value={drafts[m.id_match]?.right ?? ''}
                  onChangeText={v =>
                    setDrafts(prev => ({
                      ...prev,
                      [m.id_match]: {
                        left: prev[m.id_match]?.left ?? '',
                        right: v,
                      },
                    }))
                  }
                />
                {renderCouple(m, 'RIGHT')}
                <Text
                  testID={`score-names-right-${m.id_match}`}
                  className="text-sm text-gray-800 flex-1"
                  style={{ minWidth: 80 }}
                >
                  {matchSidePlayerNames(m, 'RIGHT', participationsById)}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
