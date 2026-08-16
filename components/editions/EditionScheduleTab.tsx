import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import { queryKeys } from '@/lib/queryClient';
import { courtsApi } from '@/services/api/courtsApi';
import { scheduleApi } from '@/services/api/scheduleApi';
import {
  ApiCourt,
  ScheduleFormPayload,
  SchedulePreview,
  ScheduleState,
} from '@/types/api/edition';
import {
  canConfirmReplaceSchedule,
  flattenMatchesByCourt,
  generateBlockedReason,
  isGenerateBlocked,
} from '@/utils/edition/schedulePreview';
import { actionPillClass } from '@/utils/ui/actionButtonClass';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import EditionScheduleGeneralView from './EditionScheduleGeneralView';
import EditionScheduleMatchesBoard from './EditionScheduleMatchesBoard';
import type { ApiEditionDivision } from '@/types/api/entities';

export type ScheduleSection = 'knobs' | 'participations' | 'matches';

/** Keep prior order for still-selected courts; append newly selected ids. */
export function mergeCourtSelection(
  previous: number[],
  selected: number[]
): number[] {
  const selectedSet = new Set(selected);
  const kept = previous.filter(id => selectedSet.has(id));
  const appended = selected.filter(id => !previous.includes(id));
  return [...kept, ...appended];
}

type Props = {
  editionDivisionId: number | null;
  locationId?: number | null;
  section?: ScheduleSection;
  /** When General (no ED), stacked read-only sections for these divisions */
  divisions?: ApiEditionDivision[];
};

function playerLabel(p: any): string {
  const player = p?.player;
  if (!player) return `Participation #${p?.id_participation ?? '?'}`;
  return (
    player.name ||
    [player.first_name, player.last_name].filter(Boolean).join(' ') ||
    `Player #${player.id_player}`
  );
}

function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void
) {
  if (typeof window !== 'undefined' && window.confirm) {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm },
    ]);
  }
}

function formFromSchedule(data: ScheduleState): {
  form: ScheduleFormPayload;
  participations: any[];
} {
  const parts = Array.isArray(data.participations)
    ? [...data.participations]
    : [];
  const collecting: Record<string, boolean> = {};
  parts.forEach((p: any) => {
    if (p?.id_participation != null) {
      collecting[String(p.id_participation)] = !!p.is_collecting_points;
    }
  });
  const ed = data.edition_division || {};
  return {
    participations: parts,
    form: {
      playing_start_time: ed.playing_start_time || '',
      playing_end_time: ed.playing_end_time || '',
      player_opponents_nr: ed.player_opponents_nr,
      player_matches_repeat: ed.player_matches_repeat,
      include_final: !!ed.include_final,
      has_demonstrative_match: !!ed.has_demonstrative_match,
      include_scores: !!ed.include_scores,
      allow_replacements: !!ed.allow_replacements,
      points_per_match: ed.points_per_match,
      final_points_target: ed.final_points_target,
      court_ids: (data.courts || []).map((c: any) => c.id_court),
      is_collecting_points: collecting,
    },
  };
}

export default function EditionScheduleTab({
  editionDivisionId,
  locationId,
  section = 'knobs',
  divisions = [],
}: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participations, setParticipations] = useState<any[]>([]);
  const [form, setForm] = useState<ScheduleFormPayload>({});
  const [baseline, setBaseline] = useState<string>('');
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [adjust, setAdjust] = useState<number>(0);

  const scheduleQuery = useQuery({
    queryKey:
      section === 'matches'
        ? ([...queryKeys.schedule(editionDivisionId ?? 0), 'board'] as const)
        : queryKeys.schedule(editionDivisionId ?? 0),
    queryFn: async () => {
      const res = await scheduleApi.getSchedule(editionDivisionId!, {
        board: section === 'matches',
      });
      return res.data;
    },
    enabled: !!editionDivisionId,
  });

  const courtsQuery = useQuery({
    queryKey: ['locationCourts', locationId],
    queryFn: async () => {
      const res = await courtsApi.getCourts({
        filters: { location_id: locationId! },
        per_page: 100,
      });
      return res.data || [];
    },
    enabled: locationId != null,
  });

  const locationCourts: ApiCourt[] = courtsQuery.data || [];
  const state = scheduleQuery.data || null;
  const finalized = !!state?.is_finalized;
  const generateBlocked = isGenerateBlocked(state || {});
  const generateBlockReason = generateBlockedReason(state || {});
  const canReplace = canConfirmReplaceSchedule(state || {});

  useEffect(() => {
    if (!state) return;
    const next = formFromSchedule(state);
    setParticipations(next.participations);
    setForm(next.form);
    setBaseline(
      JSON.stringify({
        form: next.form,
        participation_ids: next.participations.map(p => p.id_participation),
      })
    );
    setPreview(null);
  }, [state]);

  const dirty = useMemo(() => {
    if (!baseline) return false;
    return (
      JSON.stringify({
        form,
        participation_ids: participations.map(p => p.id_participation),
      }) !== baseline
    );
  }, [baseline, form, participations]);

  const previewMatches = useMemo(
    () => flattenMatchesByCourt(preview?.matches_by_court),
    [preview]
  );

  const selectedCourtIds = form.court_ids || [];

  const reload = useCallback(async () => {
    await scheduleQuery.refetch();
    if (locationId != null) await courtsQuery.refetch();
  }, [courtsQuery, locationId, scheduleQuery]);

  const moveParticipation = (index: number, direction: -1 | 1) => {
    if (finalized) return;
    const next = index + direction;
    if (next < 0 || next >= participations.length) return;
    const copy = [...participations];
    const tmp = copy[index];
    copy[index] = copy[next];
    copy[next] = tmp;
    setParticipations(copy);
  };

  const toggleCollecting = (participationId: number) => {
    if (finalized) return;
    const key = String(participationId);
    setForm(prev => ({
      ...prev,
      is_collecting_points: {
        ...(prev.is_collecting_points || {}),
        [key]: !(prev.is_collecting_points || {})[key],
      },
    }));
  };

  const toggleCourtSelection = (values: (string | number | boolean)[]) => {
    if (finalized) return;
    const selected = values.map(v => Number(v)).filter(n => Number.isFinite(n));
    setForm(prev => ({
      ...prev,
      court_ids: mergeCourtSelection(prev.court_ids || [], selected),
    }));
  };

  const moveCourt = (index: number, direction: -1 | 1) => {
    if (finalized) return;
    setForm(prev => {
      const current = [...(prev.court_ids || [])];
      const next = index + direction;
      if (next < 0 || next >= current.length) return prev;
      const tmp = current[index];
      current[index] = current[next];
      current[next] = tmp;
      return { ...prev, court_ids: current };
    });
  };

  const courtName = (id: number) =>
    locationCourts.find(c => c.id_court === id)?.name ||
    (state?.courts || []).find((c: any) => c.id_court === id)?.name ||
    `Court #${id}`;

  const saveForm = useCallback(async () => {
    if (!editionDivisionId || finalized) return;
    setSaving(true);
    setError(null);
    try {
      await scheduleApi.updateForm(editionDivisionId, {
        ...form,
        participation_ids: participations.map(p => p.id_participation),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.schedule(editionDivisionId),
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  }, [
    editionDivisionId,
    finalized,
    form,
    participations,
    queryClient,
  ]);

  useRegisterPageActions(
    editionDivisionId && (section === 'knobs' || section === 'participations')
      ? {
          save: saveForm,
          refresh: reload,
          canSave: !finalized,
          isDirty: dirty,
          isSaving: saving,
        }
      : editionDivisionId && section !== 'matches'
        ? {
            refresh: reload,
            canSave: false,
            isDirty: false,
          }
        : null
  );

  const runPreview = async () => {
    if (!editionDivisionId) return;
    setSaving(true);
    setError(null);
    try {
      // Persist knobs only when not finalized; preview itself stays allowed after finalize
      if (!finalized) {
        await scheduleApi.updateForm(editionDivisionId, {
          ...form,
          participation_ids: participations.map(p => p.id_participation),
        });
      }
      const res = await scheduleApi.preview(editionDivisionId, {
        adjust: adjust || undefined,
        ...(finalized
          ? {
              ...form,
              participation_ids: participations.map(p => p.id_participation),
            }
          : {}),
      });
      setPreview(res.data);
      if (!finalized) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.schedule(editionDivisionId),
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Preview failed');
    } finally {
      setSaving(false);
    }
  };

  const runGenerate = () => {
    if (!editionDivisionId || generateBlocked) return;
    const doGenerate = async () => {
      setSaving(true);
      setError(null);
      try {
        await scheduleApi.generate(editionDivisionId, {
          ...form,
          participation_ids: participations.map(p => p.id_participation),
          adjust: adjust || undefined,
          confirm_replace: canReplace || undefined,
        });
        setPreview(null);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.schedule(editionDivisionId),
        });
      } catch (e: any) {
        setError(e?.message || 'Generate failed');
      } finally {
        setSaving(false);
      }
    };

    confirmAction(
      'Generate schedule',
      canReplace
        ? 'Replace existing REGULAR matches?'
        : 'Generate schedule matches?',
      () => void doGenerate()
    );
  };

  const runDelete = () => {
    if (!editionDivisionId || generateBlocked) return;
    const doDelete = async () => {
      setSaving(true);
      setError(null);
      try {
        await scheduleApi.destroySchedule(editionDivisionId);
        setPreview(null);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.schedule(editionDivisionId),
        });
      } catch (e: any) {
        setError(e?.message || 'Delete schedule failed');
      } finally {
        setSaving(false);
      }
    };

    confirmAction(
      'Delete schedule',
      'Delete all schedule matches for this edition division?',
      () => void doDelete()
    );
  };

  if (!editionDivisionId) {
    return (
      <EditionScheduleGeneralView divisions={divisions} section={section} />
    );
  }

  if (scheduleQuery.isLoading && !state) {
    return <ActivityIndicator />;
  }

  return (
    <View className="gap-4">
      {error && (
        <View className="bg-red-50 border border-red-200 rounded-lg p-3">
          <Text className="text-red-700 text-sm">{error}</Text>
        </View>
      )}

      {section === 'knobs' && (
        <>
          <View className="bg-white border border-gray-200 rounded-lg p-4">
            <Text className="font-semibold text-gray-900 mb-2">Status</Text>
            <Text className="text-sm text-gray-600">
              Matches: {state?.has_regular_matches ? 'yes' : 'no'} · Scores:{' '}
              {state?.has_scores ? 'yes' : 'no'} · Standings:{' '}
              {state?.has_standings ? 'yes' : 'no'} · Finalized:{' '}
              {state?.is_finalized ? 'yes' : 'no'}
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => void runPreview()}
              disabled={saving}
              className={actionPillClass(!saving, 'blue') + ' px-4'}
            >
              <Text className="text-white text-sm">Preview</Text>
            </Pressable>
            <Pressable
              onPress={runGenerate}
              disabled={saving || generateBlocked}
              className={
                actionPillClass(!(saving || generateBlocked), 'green') + ' px-4'
              }
            >
              <Text className="text-white text-sm">Generate</Text>
            </Pressable>
            <Pressable
              onPress={runDelete}
              disabled={saving || generateBlocked}
              className={
                actionPillClass(!(saving || generateBlocked), 'red') + ' px-4'
              }
            >
              <Text className="text-white text-sm">Delete schedule</Text>
            </Pressable>
          </View>
          {generateBlockReason ? (
            <Text
              testID="generate-blocked-reason"
              className="text-sm text-amber-700"
            >
              {generateBlockReason}
            </Text>
          ) : null}

          {preview && (
            <View className="bg-white border border-gray-200 rounded-lg p-4">
              <Text className="font-semibold text-gray-900 mb-2">Preview</Text>
              <Text className="text-sm text-gray-600">
                Matches: {preview.matches_count ?? '—'} · Rounds:{' '}
                {preview.rounds_total ?? '—'} · Points/match:{' '}
                {preview.points_per_match ?? '—'} · Template:{' '}
                {preview.template_version ?? '—'}
              </Text>
              {previewMatches.slice(0, 24).map((m, i) => (
                <Text key={i} className="text-xs text-gray-500 mt-1">
                  {m.court_name || `Court ${m.court_index}`} · A:
                  {(m.side_a || []).join(',')} vs B:{(m.side_b || []).join(',')}
                </Text>
              ))}
            </View>
          )}

          <View className="bg-white border border-gray-200 rounded-lg p-4 gap-3">
            <Text className="font-semibold text-gray-900">Schedule knobs</Text>
            {(
              [
                ['playing_start_time', 'Start (HH:MM)'],
                ['playing_end_time', 'End (HH:MM)'],
                ['player_opponents_nr', 'Opponents / player'],
                ['player_matches_repeat', 'Repeat partners'],
                ['final_points_target', 'Final points target'],
              ] as const
            ).map(([key, label]) => (
              <View key={key}>
                <Text className="text-xs text-gray-500 mb-1">{label}</Text>
                <TextInput
                  editable={!finalized}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                  value={
                    form[key] === undefined || form[key] === null
                      ? ''
                      : String(form[key])
                  }
                  onChangeText={v =>
                    setForm(prev => ({
                      ...prev,
                      [key]:
                        key.includes('time') ||
                        key.includes('start') ||
                        key.includes('end')
                          ? v
                          : v === ''
                            ? undefined
                            : Number(v),
                    }))
                  }
                />
              </View>
            ))}

            {(
              [
                ['include_final', 'Include final'],
                ['has_demonstrative_match', 'Demonstrative match'],
                ['include_scores', 'Include scores'],
                ['allow_replacements', 'Allow replacements'],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                disabled={finalized}
                onPress={() =>
                  setForm(prev => ({ ...prev, [key]: !prev[key] }))
                }
                className="flex-row items-center"
              >
                <Ionicons
                  name={form[key] ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={finalized ? '#9ca3af' : '#2563eb'}
                />
                <Text className="ml-2 text-sm text-gray-800">{label}</Text>
              </Pressable>
            ))}

            <View>
              <Text className="text-xs text-gray-500 mb-1">
                Points per match adjust (±2 / ±4 / ±6)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[-6, -4, -2, 0, 2, 4, 6].map(n => (
                  <Pressable
                    key={n}
                    disabled={finalized}
                    onPress={() => setAdjust(n)}
                    className={`px-3 py-1 rounded border ${
                      adjust === n
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={
                        adjust === n
                          ? 'text-white text-sm'
                          : 'text-gray-700 text-sm'
                      }
                    >
                      {n > 0 ? `+${n}` : String(n)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {form.points_per_match != null && (
                <Text className="text-xs text-gray-500 mt-1">
                  Current points_per_match: {String(form.points_per_match)}
                </Text>
              )}
            </View>
          </View>

          <View className="bg-white border border-gray-200 rounded-lg p-4">
            <Text className="font-semibold text-gray-900 mb-2">Courts</Text>
            {locationId == null ? (
              <Text className="text-sm text-gray-500">
                No location_id on edition — cannot load courts.
              </Text>
            ) : locationCourts.length === 0 ? (
              <Text className="text-sm text-gray-500">
                No courts for this location.
              </Text>
            ) : (
              <MultiSelectDropdown
                title="Courts"
                placeholder="Select courts..."
                disabled={finalized}
                options={locationCourts.map(c => ({
                  label: `${c.name} (#${c.id_court})`,
                  value: c.id_court,
                }))}
                selectedValues={selectedCourtIds}
                onSelectionChange={toggleCourtSelection}
              />
            )}
            {selectedCourtIds.length > 0 && (
              <View className="mt-3">
                <Text className="text-xs text-gray-500 mb-1">Selected order</Text>
                {selectedCourtIds.map((id, index) => (
                  <View
                    key={id}
                    className="flex-row items-center justify-between py-1"
                  >
                    <Text className="text-sm text-gray-800 flex-1">
                      {index + 1}. {courtName(id)}
                    </Text>
                    <View className="flex-row">
                      <Pressable
                        disabled={finalized}
                        onPress={() => moveCourt(index, -1)}
                        className="p-2"
                        accessibilityLabel={`Move court ${id} up`}
                      >
                        <Ionicons name="arrow-up" size={18} color="#374151" />
                      </Pressable>
                      <Pressable
                        disabled={finalized}
                        onPress={() => moveCourt(index, 1)}
                        className="p-2"
                        accessibilityLabel={`Move court ${id} down`}
                      >
                        <Ionicons name="arrow-down" size={18} color="#374151" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      {section === 'participations' && (
        <View className="bg-white border border-gray-200 rounded-lg p-4">
          <Text className="font-semibold text-gray-900 mb-2">
            Participations order
          </Text>
          <Text className="text-xs text-gray-500 mb-2">
            Same-ED order only. Move players across divisions on the Divisions
            tab. Use top Save to persist.
          </Text>
          {participations.map((p, index) => {
            const collecting =
              !!(form.is_collecting_points || {})[String(p.id_participation)];
            return (
              <View
                key={p.id_participation}
                className="flex-row items-center justify-between py-2 border-b border-gray-100"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-sm text-gray-800">
                    {index + 1}. {playerLabel(p)}
                  </Text>
                  <Pressable
                    disabled={finalized}
                    onPress={() => toggleCollecting(p.id_participation)}
                    className="flex-row items-center mt-1"
                  >
                    <Ionicons
                      name={collecting ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={finalized ? '#9ca3af' : '#2563eb'}
                    />
                    <Text className="ml-1 text-xs text-gray-600">
                      Collecting points
                    </Text>
                  </Pressable>
                </View>
                <View className="flex-row">
                  <Pressable
                    disabled={finalized}
                    onPress={() => moveParticipation(index, -1)}
                    className="p-2"
                  >
                    <Ionicons name="arrow-up" size={18} color="#374151" />
                  </Pressable>
                  <Pressable
                    disabled={finalized}
                    onPress={() => moveParticipation(index, 1)}
                    className="p-2"
                  >
                    <Ionicons name="arrow-down" size={18} color="#374151" />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {section === 'matches' && state && (
        <EditionScheduleMatchesBoard
          editionDivisionId={editionDivisionId}
          state={state}
          onRefresh={reload}
        />
      )}
    </View>
  );
}
