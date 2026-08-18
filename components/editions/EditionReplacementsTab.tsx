import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import { EditionGeneralEditHint } from '@/components/editions/editionGeneralHint';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { usePlayerPicker } from '@/hooks/usePlayerPicker';
import { queryKeys } from '@/lib/queryClient';
import { replacementsApi } from '@/services/api/replacementsApi';
import { scheduleApi } from '@/services/api/scheduleApi';
import { GameMatch, ReplacementRow } from '@/types/api/edition';
import { clockHi } from '@/utils/edition/clockHi';
import { actionPillClass } from '@/utils/ui/actionButtonClass';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

type Props = {
  editionId: number;
  editionDivisionId: number | null;
};

const NONE_MATCH = 0;
const NONE_SUBSTITUTE = '';

function playerLabel(p: any): string {
  const player = p?.player;
  if (!player) return `Participation #${p?.id_participation ?? '?'}`;
  return (
    player.name ||
    [player.first_name, player.last_name].filter(Boolean).join(' ') ||
    `Player #${player.id_player}`
  );
}

function playerNameFromApi(player: any): string {
  return (
    player?.name ||
    [player?.first_name, player?.last_name].filter(Boolean).join(' ') ||
    `Player #${player?.id_player}`
  );
}

export function matchLabel(m: GameMatch): string {
  const court = m.edition_division_court?.court?.name;
  const when = m.scheduled_start ? clockHi(m.scheduled_start) : null;
  const parts = [`Match #${m.id_match}`];
  if (m.match_kind) parts.push(String(m.match_kind));
  if (court) parts.push(court);
  if (when && when !== '—') parts.push(when);
  return parts.join(' · ');
}

function edLabel(r: ReplacementRow): string {
  return (
    r.edition_division?.division_title ||
    (r.edition_division_id != null
      ? `ED #${r.edition_division_id}`
      : 'ED')
  );
}

export default function EditionReplacementsTab({
  editionId,
  editionDivisionId,
}: Props) {
  const queryClient = useQueryClient();
  const [originalId, setOriginalId] = useState<number | null>(null);
  const [substituteKey, setSubstituteKey] = useState<string>(NONE_SUBSTITUTE);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isGeneral = editionDivisionId == null;

  const scheduleQuery = useQuery({
    queryKey: queryKeys.schedule(editionDivisionId ?? 'none'),
    queryFn: async () => {
      const res = await scheduleApi.getSchedule(editionDivisionId!);
      return res.data;
    },
    enabled: editionDivisionId != null,
  });

  const replacementsQuery = useQuery({
    queryKey: isGeneral
      ? queryKeys.editionReplacements(editionId)
      : queryKeys.replacements(editionDivisionId!),
    queryFn: async () => {
      if (isGeneral) {
        const res = await replacementsApi.listForEdition(editionId);
        return res.data || [];
      }
      const res = await replacementsApi.list(editionDivisionId!);
      return res.data || [];
    },
    enabled: Number.isFinite(editionId),
  });

  const playerPicker = usePlayerPicker({
    preloadCount: 100,
    selectedValue: substituteKey.startsWith('player:')
      ? Number(substituteKey.slice(7))
      : null,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.editionReplacements(editionId),
    });
    if (editionDivisionId != null) {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.schedule(editionDivisionId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.replacements(editionDivisionId),
        }),
      ]);
    }
  }, [editionDivisionId, editionId, queryClient]);

  useRegisterPageActions({ refresh });

  const participations = scheduleQuery.data?.participations ?? [];
  const matches = scheduleQuery.data?.matches ?? [];
  const rows = replacementsQuery.data ?? [];
  const allowed =
    scheduleQuery.data?.edition_division?.allow_replacements !== false;
  const finalized = !!scheduleQuery.data?.is_finalized;
  const loading =
    replacementsQuery.isLoading ||
    (!isGeneral && scheduleQuery.isLoading) ||
    (playerPicker.loading && !isGeneral && participations.length === 0);

  const participationById = useMemo(() => {
    const map = new Map<number, any>();
    participations.forEach(p => {
      if (p?.id_participation != null) map.set(p.id_participation, p);
    });
    return map;
  }, [participations]);

  const originalOptions = useMemo(
    () =>
      participations.map(p => ({
        label: playerLabel(p),
        value: p.id_participation,
      })),
    [participations]
  );

  const substituteOptions = useMemo(() => {
    const opts: Array<{ label: string; value: string }> = [
      { label: 'None', value: NONE_SUBSTITUTE },
    ];
    participations.forEach(p => {
      opts.push({
        label: `Participation · ${playerLabel(p)}`,
        value: `part:${p.id_participation}`,
      });
    });
    (playerPicker.options || []).forEach(opt => {
      opts.push({
        label: `Player · ${opt.label}`,
        value: `player:${opt.value}`,
      });
    });
    return opts;
  }, [participations, playerPicker.options]);

  const matchOptions = useMemo(
    () => [
      { label: 'Any match (optional)', value: NONE_MATCH },
      ...matches.map(m => ({
        label: matchLabel(m),
        value: m.id_match,
      })),
    ],
    [matches]
  );

  const resetForm = () => {
    setOriginalId(null);
    setSubstituteKey(NONE_SUBSTITUTE);
    setMatchId(null);
    setEditingId(null);
    setActionError(null);
  };

  const substitutePayload = () => {
    let substituteParticipationId: number | undefined;
    let substitutePlayerId: number | undefined;
    if (substituteKey.startsWith('part:')) {
      substituteParticipationId = Number(substituteKey.slice(5));
    } else if (substituteKey.startsWith('player:')) {
      substitutePlayerId = Number(substituteKey.slice(7));
    }
    return { substituteParticipationId, substitutePlayerId };
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (editionDivisionId == null || originalId == null) {
        throw new Error('Select original participation');
      }
      const { substituteParticipationId, substitutePlayerId } =
        substitutePayload();
      const payload: {
        original_participation_id: number;
        substitute_participation_id?: number;
        substitute_player_id?: number;
        match_id?: number;
      } = {
        original_participation_id: originalId,
      };
      if (substituteParticipationId != null) {
        payload.substitute_participation_id = substituteParticipationId;
      }
      if (substitutePlayerId != null) {
        payload.substitute_player_id = substitutePlayerId;
      }
      if (matchId && matchId !== NONE_MATCH) {
        payload.match_id = matchId;
      }
      return replacementsApi.create(editionDivisionId, payload);
    },
    onSuccess: async () => {
      resetForm();
      await refresh();
    },
    onError: (e: Error) => {
      setActionError(e.message || 'Create failed');
    },
  });

  const patchMutation = useMutation({
    mutationFn: async () => {
      if (editingId == null || originalId == null) {
        throw new Error('Select original participation');
      }
      const { substituteParticipationId, substitutePlayerId } =
        substitutePayload();
      return replacementsApi.patch(editingId, {
        original_participation_id: originalId,
        substitute_participation_id: substituteParticipationId ?? null,
        substitute_player_id: substitutePlayerId ?? null,
        match_id: matchId && matchId !== NONE_MATCH ? matchId : null,
      });
    },
    onSuccess: async () => {
      resetForm();
      await refresh();
    },
    onError: (e: Error) => {
      setActionError(e.message || 'Update failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => replacementsApi.destroy(id),
    onSuccess: () => refresh(),
    onError: (e: Error) => {
      setActionError(e.message || 'Delete failed');
    },
  });

  const nameForParticipationId = (
    id: number | null | undefined,
    nestedParticipation?: ReplacementRow['original_participation']
  ) => {
    if (nestedParticipation?.player) {
      return playerNameFromApi(nestedParticipation.player);
    }
    if (id == null) return '—';
    const p = participationById.get(id);
    return p ? playerLabel(p) : `Participation #${id}`;
  };

  const nameForRow = (r: ReplacementRow) => {
    if (r.substitute_participation?.player || r.substitute_participation_id) {
      return nameForParticipationId(
        r.substitute_participation_id,
        r.substitute_participation
      );
    }
    if (r.substitute_player) {
      return playerNameFromApi(r.substitute_player);
    }
    if (r.substitute_player_id) {
      const opt = playerPicker.options.find(
        o => o.value === r.substitute_player_id
      );
      return opt
        ? opt.label
        : `guest player #${r.substitute_player_id}`;
    }
    return '—';
  };

  if (loading && rows.length === 0) {
    return <ActivityIndicator />;
  }

  if (!isGeneral && !allowed) {
    return (
      <Text className="text-sm text-gray-500">
        Replacements are disabled for this edition division
        (allow_replacements).
      </Text>
    );
  }

  const queryError =
    (!isGeneral && scheduleQuery.error) || replacementsQuery.error;

  return (
    <View className="gap-3">
      {(actionError || queryError) && (
        <Text className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {actionError ||
            (queryError as Error)?.message ||
            'Failed to load replacements'}
        </Text>
      )}
      {!isGeneral && finalized && (
        <Text className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
          Schedule is finalized — replacements are read-only.
        </Text>
      )}
      {isGeneral && <EditionGeneralEditHint />}

      {!isGeneral && !finalized && (
        <View className="bg-white border border-gray-200 rounded-lg p-3 gap-3">
          <Text className="font-semibold text-gray-900">
            {editingId != null ? 'Edit replacement' : 'Create replacement'}
          </Text>

          <View
            testID="replacements-create-form-row"
            className="flex-row flex-wrap items-end gap-2"
          >
            <View className="flex-1" style={{ minWidth: 160 }}>
              <Text className="text-xs text-gray-500 mb-1">
                Original participation
              </Text>
              <SingleSelectDropdown
                options={originalOptions}
                selectedValue={originalId}
                onSelectionChange={v => setOriginalId(Number(v))}
                placeholder="Select original participation"
                title="Original participation"
                disabled={finalized}
                minWidth={160}
              />
            </View>

            <View className="flex-1" style={{ minWidth: 160 }}>
              <Text className="text-xs text-gray-500 mb-1">
                Substitute (optional)
              </Text>
              <View testID="replacements-substitute-picker">
                <SingleSelectDropdown
                  options={substituteOptions}
                  selectedValue={substituteKey}
                  onSelectionChange={v => setSubstituteKey(String(v))}
                  placeholder="None"
                  title="Substitute"
                  disabled={finalized}
                  minWidth={160}
                  searchable
                  onSearch={playerPicker.onSearch}
                  loading={playerPicker.loading}
                />
              </View>
            </View>

            <View className="flex-1" style={{ minWidth: 160 }}>
              <Text className="text-xs text-gray-500 mb-1">Match (optional)</Text>
              <SingleSelectDropdown
                options={matchOptions}
                selectedValue={matchId ?? NONE_MATCH}
                onSelectionChange={v => {
                  const n = Number(v);
                  setMatchId(n === NONE_MATCH ? null : n);
                }}
                placeholder="Any match"
                title="Match"
                disabled={finalized}
                minWidth={160}
              />
            </View>

            {editingId != null ? (
              <>
                <Pressable
                  testID="replacements-save"
                  disabled={
                    finalized || originalId == null || patchMutation.isPending
                  }
                  onPress={() => patchMutation.mutate()}
                  className={`${actionPillClass(
                    !(finalized || originalId == null || patchMutation.isPending),
                    'blue'
                  )}`}
                >
                  <Text className="text-white text-sm">Save</Text>
                </Pressable>
                <Pressable
                  testID="replacements-cancel-edit"
                  disabled={finalized || patchMutation.isPending}
                  onPress={resetForm}
                  className="rounded-lg px-3 py-2 bg-gray-500"
                >
                  <Text className="text-white text-sm">Cancel</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                testID="replacements-create"
                disabled={
                  finalized || originalId == null || createMutation.isPending
                }
                onPress={() => createMutation.mutate()}
                className={`${actionPillClass(
                  !(finalized || originalId == null || createMutation.isPending),
                  'blue'
                )}`}
              >
                <Text className="text-white text-sm">Create</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {rows.length === 0 ? (
        <Text className="text-sm text-gray-500">No replacements.</Text>
      ) : (
        rows.map(r => (
          <View
            key={r.id_replacement}
            className="bg-white border border-gray-200 rounded-lg p-3 flex-row justify-between items-center"
          >
            <View className="flex-1 pr-2">
              {isGeneral && (
                <Text className="text-xs font-medium text-gray-500 mb-1">
                  {edLabel(r)}
                </Text>
              )}
              <Text className="text-sm text-gray-800">
                #{r.id_replacement}:{' '}
                {nameForParticipationId(
                  r.original_participation_id,
                  r.original_participation
                )}{' '}
                → {nameForRow(r)}
              </Text>
              <Text className="text-xs text-gray-500">
                match {r.match_id ?? 'all'}
              </Text>
            </View>
            {!isGeneral && !finalized && (
              <View className="flex-row gap-2">
                <Pressable
                  testID={`replacements-edit-${r.id_replacement}`}
                  disabled={patchMutation.isPending}
                  onPress={() => {
                    setEditingId(r.id_replacement);
                    setOriginalId(r.original_participation_id);
                    if (r.substitute_participation_id) {
                      setSubstituteKey(`part:${r.substitute_participation_id}`);
                    } else if (r.substitute_player_id) {
                      setSubstituteKey(`player:${r.substitute_player_id}`);
                    } else {
                      setSubstituteKey(NONE_SUBSTITUTE);
                    }
                    setMatchId(r.match_id ?? null);
                    setActionError(null);
                  }}
                  className={actionPillClass(!patchMutation.isPending, 'blue')}
                >
                  <Text className="text-white text-sm">Edit</Text>
                </Pressable>
                <Pressable
                  disabled={deleteMutation.isPending}
                  onPress={() => deleteMutation.mutate(r.id_replacement)}
                  className={actionPillClass(!deleteMutation.isPending, 'red')}
                >
                  <Text className="text-white text-sm">Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}
