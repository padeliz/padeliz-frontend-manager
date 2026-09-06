import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import { EditionGeneralEditHint } from '@/components/editions/editionGeneralHint';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { queryKeys } from '@/lib/queryClient';
import { scheduleApi } from '@/services/api/scheduleApi';
import { standingsApi } from '@/services/api/standingsApi';
import { ApiEditionDivision } from '@/types/api/entities';
import { StandingRow } from '@/types/api/edition';
import { confirmAction } from '@/utils/confirmAction';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

type Props = {
  editionDivisionId: number | null;
  divisions?: ApiEditionDivision[];
};

type Draft = { points_total: string; wins: string; rank: string };

function playerLabel(participation: any): string {
  const player = participation?.player;
  if (!player) {
    return `Participation #${participation?.id_participation ?? '?'}`;
  }
  return (
    player.name ||
    [player.first_name, player.last_name].filter(Boolean).join(' ') ||
    `Player #${player.id_player}`
  );
}

function divisionTitle(d: ApiEditionDivision): string {
  return d.division_title || `ED #${d.id_edition_division}`;
}

function StandingsReadonly({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return <Text className="text-sm text-gray-500">No standings yet.</Text>;
  }
  return (
    <View className="gap-2">
      {rows.map(r => (
        <Text key={r.id_standing} className="text-sm text-gray-800">
          {playerLabel(r.participation)} · rank {r.rank ?? '—'} · wins{' '}
          {r.wins ?? '—'} · points {r.points_total ?? '—'}
        </Text>
      ))}
    </View>
  );
}

function StandingsGeneralView({
  divisions,
}: {
  divisions: ApiEditionDivision[];
}) {
  const scheduleQueries = useQueries({
    queries: divisions.map(d => ({
      queryKey: queryKeys.schedule(d.id_edition_division),
      queryFn: async () => {
        const res = await scheduleApi.getSchedule(d.id_edition_division);
        return res.data;
      },
    })),
  });
  const standingsQueries = useQueries({
    queries: divisions.map(d => ({
      queryKey: queryKeys.standings(d.id_edition_division),
      queryFn: async () => {
        const res = await standingsApi.getStandings(d.id_edition_division);
        return res.data || [];
      },
    })),
  });

  const loading =
    scheduleQueries.some(q => q.isLoading) ||
    standingsQueries.some(q => q.isLoading);

  if (
    loading &&
    standingsQueries.every(q => !(q.data && (q.data as any[]).length))
  ) {
    return <ActivityIndicator />;
  }

  return (
    <View className="gap-4" testID="standings-general-view">
      <EditionGeneralEditHint />
      {divisions.map((d, i) => {
        const participations = Array.isArray(
          scheduleQueries[i]?.data?.participations
        )
          ? scheduleQueries[i]!.data!.participations
          : [];
        const byParticipationId = new Map<number, any>();
        participations.forEach((p: any) => {
          if (p?.id_participation != null) {
            byParticipationId.set(p.id_participation, p);
          }
        });
        const rows: StandingRow[] = (standingsQueries[i]?.data || []).map(
          (r: StandingRow) => ({
            ...r,
            participation:
              r.participation ||
              byParticipationId.get(r.participation_id) ||
              null,
          })
        );
        return (
          <View
            key={d.id_edition_division}
            testID={`standings-general-ed-${d.id_edition_division}`}
            className="bg-white border border-gray-200 rounded-lg p-3"
          >
            <Text className="font-semibold text-gray-900 mb-2">
              {divisionTitle(d)}
            </Text>
            <StandingsReadonly rows={rows} />
          </View>
        );
      })}
    </View>
  );
}

export default function EditionStandingsTab({
  editionDivisionId,
  divisions = [],
}: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [baseline, setBaseline] = useState('');
  const recalculateStatus = useActionButtonStatus({ auditoryFeedback: true });

  const scheduleQuery = useQuery({
    queryKey: queryKeys.schedule(editionDivisionId ?? 0),
    queryFn: async () => {
      const res = await scheduleApi.getSchedule(editionDivisionId!);
      return res.data;
    },
    enabled: !!editionDivisionId,
  });

  const standingsQuery = useQuery({
    queryKey: queryKeys.standings(editionDivisionId ?? 0),
    queryFn: async () => {
      const res = await standingsApi.getStandings(editionDivisionId!);
      return res.data || [];
    },
    enabled: !!editionDivisionId,
  });

  const finalized = !!scheduleQuery.data?.is_finalized;
  const participations = useMemo(
    () =>
      Array.isArray(scheduleQuery.data?.participations)
        ? scheduleQuery.data!.participations
        : [],
    [scheduleQuery.data?.participations]
  );

  const rows: StandingRow[] = useMemo(() => {
    const byParticipationId = new Map<number, any>();
    participations.forEach((p: any) => {
      if (p?.id_participation != null) {
        byParticipationId.set(p.id_participation, p);
      }
    });
    return (standingsQuery.data || []).map(r => ({
      ...r,
      participation:
        r.participation || byParticipationId.get(r.participation_id) || null,
    }));
  }, [participations, standingsQuery.data]);

  useEffect(() => {
    const next: Record<number, Draft> = {};
    rows.forEach(r => {
      next[r.id_standing] = {
        points_total: String(r.points_total ?? 0),
        wins: String(r.wins ?? 0),
        rank: String(r.rank ?? 0),
      };
    });
    setDrafts(next);
    setBaseline(JSON.stringify(next));
  }, [standingsQuery.dataUpdatedAt, scheduleQuery.dataUpdatedAt]);

  const dirty = useMemo(
    () => baseline !== '' && JSON.stringify(drafts) !== baseline,
    [baseline, drafts]
  );

  const reload = useCallback(async () => {
    await Promise.all([
      standingsQuery.refetch({ throwOnError: true }),
      scheduleQuery.refetch({ throwOnError: true }),
    ]);
  }, [scheduleQuery, standingsQuery]);

  const saveAll = useCallback(async () => {
    if (!editionDivisionId || finalized) return;
    setSaving(true);
    try {
      const base = JSON.parse(baseline || '{}') as Record<number, Draft>;
      for (const [id, d] of Object.entries(drafts)) {
        const b = base[Number(id)];
        if (
          b &&
          b.points_total === d.points_total &&
          b.wins === d.wins &&
          b.rank === d.rank
        ) {
          continue;
        }
        await standingsApi.updateStanding(Number(id), {
          points_total: Number(d.points_total),
          wins: Number(d.wins),
          rank: Number(d.rank),
        });
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.standings(editionDivisionId),
      });
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

  const recalculate = () => {
    if (!editionDivisionId || finalized) return;
    confirmAction(
      'Recalculate standings',
      'Recalculate standings from match scores?',
      () => {
        void recalculateStatus.run(async () => {
          await standingsApi.recalculate(editionDivisionId);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.standings(editionDivisionId),
          });
          await queryClient.invalidateQueries({
            queryKey: queryKeys.schedule(editionDivisionId),
          });
        });
      }
    );
  };

  if (!editionDivisionId) {
    return <StandingsGeneralView divisions={divisions} />;
  }

  if (
    (standingsQuery.isLoading || scheduleQuery.isLoading) &&
    rows.length === 0
  ) {
    return <ActivityIndicator />;
  }

  return (
    <View className="gap-3">
      {finalized && (
        <Text className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
          Schedule is finalized — standings are read-only.
        </Text>
      )}
      <View className="self-start">
        <ActionButton
          testID="standings-recalculate"
          label="Recalculate"
          variant="primary"
          size="sm"
          status={recalculateStatus.status}
          errorMessage={recalculateStatus.errorMessage ?? undefined}
          disabled={finalized || saving}
          onPress={recalculate}
        />
      </View>
      {rows.length === 0 ? (
        <Text className="text-sm text-gray-500">No standings yet.</Text>
      ) : (
        rows.map(r => (
          <View
            key={r.id_standing}
            className="bg-white border border-gray-200 rounded-lg p-3"
          >
            <Text className="text-sm text-gray-800 mb-2">
              {playerLabel(r.participation)} · #{r.id_standing}
            </Text>
            <View className="flex-row flex-wrap gap-2 items-center">
              {(['rank', 'wins', 'points_total'] as const).map(field => (
                <View key={field} className="mr-2">
                  <Text className="text-xs text-gray-500">{field}</Text>
                  <AppTextInput
                    editable={!finalized}
                    className="border border-gray-300 rounded px-2 py-1 w-20"
                    keyboardType="numeric"
                    value={drafts[r.id_standing]?.[field] ?? ''}
                    onChangeText={v =>
                      setDrafts(prev => ({
                        ...prev,
                        [r.id_standing]: {
                          ...prev[r.id_standing],
                          [field]: v,
                        },
                      }))
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}
