import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import { EditionGeneralEditHint } from '@/components/editions/editionGeneralHint';
import { queryKeys } from '@/lib/queryClient';
import { matchesApi } from '@/services/api/matchesApi';
import { scheduleApi } from '@/services/api/scheduleApi';
import { ApiEditionDivision } from '@/types/api/entities';
import { GameMatch, ScheduleState } from '@/types/api/edition';
import {
  buildParticipationsById,
  matchSidePlayerNames,
} from '@/utils/edition/matchPlayerLabels';
import { clockHi } from '@/utils/edition/clockHi';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  editionDivisionId: number | null;
  divisions?: ApiEditionDivision[];
};

function sideScore(match: GameMatch, side: 'LEFT' | 'RIGHT'): string {
  const found = (match.sides || []).find(
    s => String(s.side).toUpperCase() === side
  );
  return found?.score == null ? '' : String(found.score);
}

function sideCoupleUrl(match: GameMatch, side: 'LEFT' | 'RIGHT'): string | null {
  const found = (match.sides || []).find(
    s => String(s.side).toUpperCase() === side
  );
  return found?.couple_image_url ?? null;
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
        const includeFinal = !!(data?.edition_division as any)?.include_final;
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
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<number, { left: string; right: string }>
  >({});
  const [baseline, setBaseline] = useState('');

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
    await scheduleQuery.refetch();
  }, [scheduleQuery]);

  const saveAll = useCallback(async () => {
    if (!editionDivisionId || finalized) return;
    setSaving(true);
    setError(null);
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
      setHint(
        'Scores saved. Run Recalculate on the Standings tab if rankings need updating.'
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.schedule(editionDivisionId),
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  }, [baseline, drafts, editionDivisionId, finalized, queryClient]);

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
      {error && (
        <Text className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</Text>
      )}
      {hint && (
        <Text className="text-sm text-blue-700 bg-blue-50 p-2 rounded">{hint}</Text>
      )}
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
          const leftUrl = sideCoupleUrl(m, 'LEFT');
          const rightUrl = sideCoupleUrl(m, 'RIGHT');
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
                {leftUrl ? (
                  <Image
                    testID={`couple-left-${m.id_match}`}
                    source={{ uri: leftUrl }}
                    style={{ width: 36, height: 36 }}
                  />
                ) : (
                  <Text testID={`couple-missing-left-${m.id_match}`}>⚠️</Text>
                )}
                <TextInput
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
                <TextInput
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
                {rightUrl ? (
                  <Image
                    testID={`couple-right-${m.id_match}`}
                    source={{ uri: rightUrl }}
                    style={{ width: 36, height: 36 }}
                  />
                ) : (
                  <Text testID={`couple-missing-right-${m.id_match}`}>⚠️</Text>
                )}
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
