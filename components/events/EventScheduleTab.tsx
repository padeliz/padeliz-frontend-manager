import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { queryKeys } from '@/lib/queryClient';
import { courtsApi } from '@/services/api/courtsApi';
import { scheduleApi } from '@/services/api/scheduleApi';
import {
  ApiCourt,
  ScheduleFormPayload,
  SchedulePreview,
  ScheduleState,
} from '@/types/api/event';
import {
  canConfirmReplaceSchedule,
  flattenMatchesByCourt,
  generateBlockedReason,
  isGenerateBlocked,
} from '@/utils/event/schedulePreview';
import { confirmAction } from '@/utils/confirmAction';
import { formatDivisionPlayingWindow } from '@/utils/productDateTime';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import EventScheduleGeneralView from './EventScheduleGeneralView';
import EventScheduleMatchesBoard from './EventScheduleMatchesBoard';
import type { ApiEventDivision } from '@/types/api/entities';

export type ScheduleSection = 'knobs' | 'matches';

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
  eventDivisionId: number | null;
  locationId?: number | null;
  section?: ScheduleSection;
  /** When General (no ED), stacked read-only sections for these divisions */
  divisions?: ApiEventDivision[];
};

/** Applied when an event division has no schedule row yet. */
export const SCHEDULE_KNOB_DEFAULTS = {
  player_matches_repeat: 1,
  include_scores: true,
  allow_replacements: true,
  final_points_target: 24,
  adjust: 0,
} as const;

function knobsFormPayload(form: ScheduleFormPayload): ScheduleFormPayload {
  const { is_collecting_points: _collecting, participation_ids: _ids, ...rest } =
    form;
  return rest;
}

/**
 * Knobs live on the schedule row, which is null until the first upsert.
 * Playing times stay on the event division and are never sent back here.
 */
export function formFromSchedule(data: ScheduleState): ScheduleFormPayload {
  const schedule = data.schedule || null;
  return {
    player_opponents_nr: schedule?.player_opponents_nr ?? undefined,
    player_matches_repeat:
      schedule?.player_matches_repeat ??
      SCHEDULE_KNOB_DEFAULTS.player_matches_repeat,
    include_final: !!schedule?.include_final,
    has_demonstrative_match: !!schedule?.has_demonstrative_match,
    include_scores:
      schedule == null
        ? SCHEDULE_KNOB_DEFAULTS.include_scores
        : !!schedule.include_scores,
    allow_replacements:
      schedule == null
        ? SCHEDULE_KNOB_DEFAULTS.allow_replacements
        : !!schedule.allow_replacements,
    points_per_match: schedule?.points_per_match ?? undefined,
    final_points_target:
      schedule?.final_points_target ??
      SCHEDULE_KNOB_DEFAULTS.final_points_target,
    adjust: schedule?.adjust ?? SCHEDULE_KNOB_DEFAULTS.adjust,
    court_ids: (data.courts || []).map((c: any) => c.id_court),
  };
}

export default function EventScheduleTab({
  eventDivisionId,
  locationId,
  section = 'knobs',
  divisions = [],
}: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ScheduleFormPayload>({});
  const [baseline, setBaseline] = useState<string>('');
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [syncedScheduleState, setSyncedScheduleState] =
    useState<ScheduleState | null>(null);
  const previewStatus = useActionButtonStatus();
  const generateStatus = useActionButtonStatus({ auditoryFeedback: true });
  const deleteStatus = useActionButtonStatus({ auditoryFeedback: true });

  const scheduleQuery = useQuery({
    queryKey:
      section === 'matches'
        ? ([...queryKeys.schedule(eventDivisionId ?? 0), 'board'] as const)
        : queryKeys.schedule(eventDivisionId ?? 0),
    queryFn: async () => {
      const res = await scheduleApi.getSchedule(eventDivisionId!, {
        board: section === 'matches',
      });
      return res.data;
    },
    enabled: !!eventDivisionId,
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
  // Sync editable form from schedule on first paint with data (not only in effect).
  if (state !== syncedScheduleState) {
    setSyncedScheduleState(state);
    if (state) {
      const next = formFromSchedule(state);
      setForm(next);
      setBaseline(JSON.stringify(next));
      setPreview(null);
    }
  }
  const finalized = !!state?.is_finalized;
  const generateBlocked = isGenerateBlocked(state || {});
  const generateBlockReason = generateBlockedReason(state || {});
  const canReplace = canConfirmReplaceSchedule(state || {});
  const adjust = form.adjust ?? SCHEDULE_KNOB_DEFAULTS.adjust;
  const playingWindowLabel = formatDivisionPlayingWindow(
    state?.event_division?.playing_starts_at,
    state?.event_division?.playing_ends_at
  );

  const dirty = useMemo(() => {
    if (!baseline) return false;
    return JSON.stringify(form) !== baseline;
  }, [baseline, form]);

  const previewMatches = useMemo(
    () => flattenMatchesByCourt(preview?.matches_by_court),
    [preview]
  );

  const selectedCourtIds = form.court_ids || [];

  const reload = useCallback(async () => {
    await scheduleQuery.refetch({ throwOnError: true });
    if (locationId != null) {
      await courtsQuery.refetch({ throwOnError: true });
    }
  }, [courtsQuery, locationId, scheduleQuery]);

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
    if (!eventDivisionId || finalized) return;
    setSaving(true);
    try {
      await scheduleApi.updateForm(
        eventDivisionId,
        knobsFormPayload(form)
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.schedule(eventDivisionId),
      });
    } finally {
      setSaving(false);
    }
  }, [
    eventDivisionId,
    finalized,
    form,
    queryClient,
  ]);

  useRegisterPageActions(
    eventDivisionId && section === 'knobs'
      ? {
          save: saveForm,
          refresh: reload,
          canSave: !finalized,
          isDirty: dirty,
          isSaving: saving,
        }
      : null
  );

  const runPreview = () => {
    if (!eventDivisionId) return;
    void previewStatus.run(async () => {
      // Persist knobs only when not finalized; preview itself stays allowed after finalize
      if (!finalized) {
        await scheduleApi.updateForm(
          eventDivisionId,
          knobsFormPayload(form)
        );
      }
      const res = await scheduleApi.preview(eventDivisionId, {
        ...(finalized ? knobsFormPayload(form) : {}),
        adjust: adjust || undefined,
      });
      setPreview(res.data);
      if (!finalized) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.schedule(eventDivisionId),
        });
      }
    });
  };

  const runGenerate = () => {
    if (!eventDivisionId || generateBlocked) return;
    confirmAction(
      'Generate schedule',
      canReplace
        ? 'Replace existing REGULAR matches?'
        : 'Generate schedule matches?',
      () => {
        void generateStatus.run(async () => {
          await scheduleApi.generate(eventDivisionId, {
            ...knobsFormPayload(form),
            adjust: adjust || undefined,
            confirm_replace: canReplace || undefined,
          });
          setPreview(null);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.schedule(eventDivisionId),
          });
        });
      }
    );
  };

  const runDelete = () => {
    if (!eventDivisionId || generateBlocked) return;
    confirmAction(
      'Delete schedule',
      'Delete all schedule matches for this event division?',
      () => {
        void deleteStatus.run(async () => {
          await scheduleApi.destroySchedule(eventDivisionId);
          setPreview(null);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.schedule(eventDivisionId),
          });
        });
      }
    );
  };

  const actionsBusy =
    saving ||
    previewStatus.status === 'pending' ||
    generateStatus.status === 'pending' ||
    deleteStatus.status === 'pending';

  if (!eventDivisionId) {
    return (
      <EventScheduleGeneralView divisions={divisions} section={section} />
    );
  }

  if (scheduleQuery.isPending && !state) {
    return <ActivityIndicator />;
  }

  return (
    <View className="gap-4">
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
            <ActionButton
              testID="schedule-preview"
              label="Preview"
              variant="primary"
              size="sm"
              status={previewStatus.status}
              errorMessage={previewStatus.errorMessage ?? undefined}
              disabled={actionsBusy}
              onPress={runPreview}
            />
            <ActionButton
              testID="schedule-generate"
              label="Generate"
              variant="positive"
              size="sm"
              status={generateStatus.status}
              errorMessage={generateStatus.errorMessage ?? undefined}
              disabled={actionsBusy || generateBlocked}
              onPress={runGenerate}
            />
            <ActionButton
              testID="schedule-delete"
              label="Delete schedule"
              variant="danger"
              size="sm"
              status={deleteStatus.status}
              errorMessage={deleteStatus.errorMessage ?? undefined}
              disabled={actionsBusy || generateBlocked}
              onPress={runDelete}
            />
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
                {preview.points_per_match_print ?? '—'} · Template:{' '}
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
            <View testID="schedule-playing-window">
              <Text className="text-xs text-gray-500 mb-1">
                Playing window (edit on the Divisions tab)
              </Text>
              <Text className="text-sm text-gray-800">
                {playingWindowLabel}
              </Text>
            </View>
            {(
              [
                ['player_opponents_nr', 'Opponents / player'],
                ['player_matches_repeat', 'Repeat partners'],
                ['final_points_target', 'Final points target'],
              ] as const
            ).map(([key, label]) => (
              <View key={key}>
                <Text className="text-xs text-gray-500 mb-1">{label}</Text>
                <AppTextInput
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
                      [key]: v === '' ? undefined : Number(v),
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
                    testID={`schedule-adjust-${n}`}
                    disabled={finalized}
                    onPress={() => setForm(prev => ({ ...prev, adjust: n }))}
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
                No location_id on event — cannot load courts.
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

      {section === 'matches' && state && (
        <EventScheduleMatchesBoard
          eventDivisionId={eventDivisionId}
          state={state}
          onRefresh={reload}
        />
      )}
    </View>
  );
}
