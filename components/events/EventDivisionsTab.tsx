/**
 * Divisions tab: identity-only event divisions with skill_order reordering.
 * Schedule knobs live on the Schedule tab, not here.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { ApiDivision, ApiEventDivision } from '@/types/api/entities';
import { confirmAction } from '@/utils/confirmAction';
import { boundOrNull } from '@/utils/playerLevel';
import { sortBySkillOrder } from '@/utils/event/eventDivisionOrder';
import { openInNewWindow } from '@/utils/openInNewWindow';
import {
  bucharestDatetimeLocalToUnix,
  formatDivisionPlayingWindow,
} from '@/utils/productDateTime';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import SortableRow, {
  moveInList,
  reorderList,
  SortableArrows,
  SortableDragHandle,
} from './SortableRow';

const eventDivisionsApi = new EventDivisionsApiService();

const ROW_HEIGHT = 56;

type Props = {
  eventId: number;
  eventFinalized: boolean;
  divisions: ApiEventDivision[];
  catalogDivisions: ApiDivision[];
  onRefresh: () => Promise<void>;
};

type NewDivisionDraft = {
  division_id: number | null;
  division_title: string;
  players_limit: string;
  /** Bucharest datetime-local (YYYY-MM-DDTHH:mm). */
  playing_starts_at_local: string;
  playing_ends_at_local: string;
  entry_fee: string;
  /** Weakest accepted level for this event division (optional, 2 decimals). */
  level_min: string;
  /** Strongest accepted level for this event division (optional, 2 decimals). */
  level_max: string;
};

const EMPTY_DRAFT: NewDivisionDraft = {
  division_id: null,
  division_title: '',
  players_limit: '',
  playing_starts_at_local: '',
  playing_ends_at_local: '',
  entry_fee: '',
  level_min: '',
  level_max: '',
};

function catalogBoundText(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  return String(value);
}

export function divisionLabel(ed: ApiEventDivision): string {
  return (
    ed.division_title || ed.division?.name || `ED #${ed.id_event_division}`
  );
}

function DeleteDivisionButton({
  ed,
  onDeleted,
}: {
  ed: ApiEventDivision;
  onDeleted: () => Promise<void>;
}) {
  const { status, errorMessage, run } = useActionButtonStatus({
    auditoryFeedback: true,
    successHoldMs: 4000,
  });

  return (
    <ActionButton
      testID={`division-delete-${ed.id_event_division}`}
      iconOnly
      startIcon="trash-outline"
      accessibilityLabel={`Delete ${divisionLabel(ed)}`}
      variant="ghost"
      iconColor="#dc2626"
      size="sm"
      status={status}
      errorMessage={errorMessage ?? undefined}
      className="p-2 bg-transparent border-transparent"
      onPress={() => {
        confirmAction(
          'Delete event division',
          `Delete ${divisionLabel(ed)}? Participations and schedule for it are removed too.`,
          () => {
            void run(async () => {
              await eventDivisionsApi.deleteEventDivision(
                ed.id_event_division
              );
              await onDeleted();
            });
          }
        );
      }}
    />
  );
}

export default function EventDivisionsTab({
  eventId,
  eventFinalized,
  divisions,
  catalogDivisions,
  onRefresh,
}: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<ApiEventDivision[]>(() =>
    sortBySkillOrder(divisions)
  );
  const [draft, setDraft] = useState<NewDivisionDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const createStatus = useActionButtonStatus({ auditoryFeedback: true });

  useEffect(() => {
    setLocal(sortBySkillOrder(divisions));
  }, [divisions]);

  const orderDirty = useMemo(() => {
    const original = sortBySkillOrder(divisions).map(d => d.id_event_division);
    return local.some((d, i) => d.id_event_division !== original[i]);
  }, [divisions, local]);

  const catalogOptions = useMemo(
    () =>
      catalogDivisions.map(d => ({
        label: `${d.name} (#${d.id_division})`,
        value: d.id_division,
      })),
    [catalogDivisions]
  );

  const pickDivision = (divisionId: number) => {
    const picked = catalogDivisions.find(d => d.id_division === divisionId);
    setDraft(prev => ({
      ...prev,
      division_id: divisionId,
      division_title:
        prev.division_title.trim() === '' ? picked?.name || '' : prev.division_title,
      level_min: catalogBoundText(picked?.level_min),
      level_max: catalogBoundText(picked?.level_max),
    }));
  };

  const move = (index: number, dir: -1 | 1) => {
    if (eventFinalized) return;
    const next = moveInList(local, index, dir);
    if (next) setLocal(next);
  };

  const reorder = (from: number, to: number) => {
    if (eventFinalized) return;
    const next = reorderList(local, from, to);
    if (next) setLocal(next);
  };

  const saveOrder = useCallback(async () => {
    if (eventFinalized || !orderDirty) return;
    setSaving(true);
    try {
      await eventDivisionsApi.reorderEventDivisions(
        eventId,
        local.map((d, i) => ({
          id_event_division: d.id_event_division,
          skill_order: i,
        }))
      );
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }, [eventFinalized, eventId, local, onRefresh, orderDirty]);

  useRegisterPageActions({
    save: saveOrder,
    refresh: onRefresh,
    canSave: orderDirty && !eventFinalized,
    isDirty: orderDirty && !eventFinalized,
    isSaving: saving,
  });

  const create = () => {
    if (eventFinalized) return;
    void createStatus.run(async () => {
      if (draft.division_id == null) {
        throw new Error('Select a division from the catalog.');
      }
      const playersLimit = Number(draft.players_limit);
      if (!Number.isFinite(playersLimit) || playersLimit < 1) {
        throw new Error('Players limit must be a positive number.');
      }
      const playingStartsAt = bucharestDatetimeLocalToUnix(
        draft.playing_starts_at_local.trim()
      );
      const playingEndsAt = bucharestDatetimeLocalToUnix(
        draft.playing_ends_at_local.trim()
      );
      if (playingStartsAt == null || playingEndsAt == null) {
        throw new Error(
          'Playing start and end (Europe/Bucharest) are required (YYYY-MM-DDTHH:mm).'
        );
      }
      if (playingStartsAt >= playingEndsAt) {
        throw new Error('Playing end must be after playing start.');
      }
      const entryFeeRaw = draft.entry_fee.trim();
      if (entryFeeRaw === '') {
        throw new Error('Entry fee is required.');
      }
      const entryFee = Number(entryFeeRaw);
      if (!Number.isFinite(entryFee) || entryFee < 0 || !Number.isInteger(entryFee)) {
        throw new Error('Entry fee must be a non-negative whole number (RON).');
      }
      await eventDivisionsApi.createEventDivision({
        event_id: eventId,
        division_id: draft.division_id,
        division_title: draft.division_title.trim() || undefined,
        players_limit: playersLimit,
        playing_starts_at: playingStartsAt,
        playing_ends_at: playingEndsAt,
        entry_fee: entryFee,
        ...(boundOrNull(draft.level_min) != null
          ? { level_min: boundOrNull(draft.level_min)! }
          : {}),
        ...(boundOrNull(draft.level_max) != null
          ? { level_max: boundOrNull(draft.level_max)! }
          : {}),
      });
      // Preserve schedule/fee fields for the next add; clear division identity + levels.
      setDraft(prev => ({
        ...EMPTY_DRAFT,
        players_limit: prev.players_limit,
        playing_starts_at_local: prev.playing_starts_at_local,
        playing_ends_at_local: prev.playing_ends_at_local,
        entry_fee: prev.entry_fee,
      }));
      await onRefresh();
    });
  };

  const openEdit = (ed: ApiEventDivision) => {
    const href = `/event-divisions/${ed.id_event_division}`;
    openInNewWindow(href, () => router.push(href as any));
  };

  return (
    <View testID="event-divisions-tab">
      <Text className="text-lg font-semibold text-gray-900 mb-3">Divisions</Text>

      {eventFinalized && (
        <Text
          testID="divisions-finalized-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3"
        >
          Event is finalized — divisions are read-only.
        </Text>
      )}

      {!eventFinalized && (
        <View
          testID="divisions-add-form"
          className="mb-4 border border-gray-200 rounded-lg p-3 bg-white gap-2"
        >
          <Text className="font-semibold text-gray-900">Add division</Text>
          <View className="flex-row flex-wrap items-end gap-2">
            <View
              testID="divisions-catalog-picker"
              className="flex-1"
              style={{ minWidth: 180 }}
            >
              <Text className="text-xs text-gray-500 mb-1">Division</Text>
              <SingleSelectDropdown
                options={catalogOptions}
                selectedValue={draft.division_id}
                onSelectionChange={v => pickDivision(Number(v))}
                placeholder="Select division"
                title="Division"
                minWidth={180}
              />
            </View>
            <View className="flex-1" style={{ minWidth: 140 }}>
              <Text className="text-xs text-gray-500 mb-1">Title</Text>
              <AppTextInput
                testID="divisions-title-input"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.division_title}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, division_title: v }))
                }
                placeholder="Division title"
              />
            </View>
            <View style={{ minWidth: 110 }}>
              <Text className="text-xs text-gray-500 mb-1">Players limit</Text>
              <AppTextInput
                testID="divisions-players-limit-input"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.players_limit}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, players_limit: v }))
                }
                keyboardType="numeric"
              />
            </View>
            <View style={{ minWidth: 110 }}>
              <Text className="text-xs text-gray-500 mb-1">Entry fee (RON)</Text>
              <AppTextInput
                testID="divisions-entry-fee-input"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.entry_fee}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, entry_fee: v }))
                }
                keyboardType="numeric"
              />
            </View>
            <View style={{ minWidth: 180 }}>
              <Text className="text-xs text-gray-500 mb-1">
                Playing starts (Bucharest)
              </Text>
              <AppTextInput
                testID="divisions-start-input"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.playing_starts_at_local}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, playing_starts_at_local: v }))
                }
                placeholder="YYYY-MM-DDTHH:mm"
              />
            </View>
            <View style={{ minWidth: 180 }}>
              <Text className="text-xs text-gray-500 mb-1">
                Playing ends (Bucharest)
              </Text>
              <AppTextInput
                testID="divisions-end-input"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.playing_ends_at_local}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, playing_ends_at_local: v }))
                }
                placeholder="YYYY-MM-DDTHH:mm"
              />
            </View>
            <View style={{ minWidth: 100 }}>
              <Text className="text-xs text-gray-500 mb-1">Level min</Text>
              <AppTextInput
                testID="divisions-level-min-input"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.level_min}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, level_min: v }))
                }
                placeholder="e.g. 4.99"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ minWidth: 100 }}>
              <Text className="text-xs text-gray-500 mb-1">Level max</Text>
              <AppTextInput
                testID="divisions-level-max-input"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.level_max}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, level_max: v }))
                }
                placeholder="e.g. 4.67"
                keyboardType="decimal-pad"
              />
            </View>
            <ActionButton
              testID="divisions-add-button"
              label="Add"
              variant="primary"
              size="sm"
              status={createStatus.status}
              errorMessage={createStatus.errorMessage ?? undefined}
              onPress={create}
            />
          </View>
        </View>
      )}

      <View
        testID="divisions-list"
        className="border border-gray-200 rounded-lg bg-white"
      >
        {local.map((ed, index) => (
          <SortableRow
            key={ed.id_event_division}
            index={index}
            count={local.length}
            locked={eventFinalized}
            rowHeight={ROW_HEIGHT}
            onReorder={reorder}
          >
            <View
              testID={`division-row-${ed.id_event_division}`}
              className="flex-row flex-wrap items-center px-3 py-2 border-b border-gray-100"
            >
              {!eventFinalized && (
                <SortableDragHandle
                  testID={`division-drag-handle-${ed.id_event_division}`}
                />
              )}
              {ed.division?.color ? (
                <View
                  testID={`division-color-${ed.id_event_division}`}
                  style={{
                    width: 12,
                    height: 12,
                    marginRight: 8,
                    backgroundColor: ed.division.color,
                  }}
                />
              ) : null}
              <View className="flex-1 mr-2" style={{ minWidth: 140 }}>
                <Text className="text-gray-900 font-medium">
                  {index + 1}. {divisionLabel(ed)}
                </Text>
                <Text
                  testID={`division-meta-${ed.id_event_division}`}
                  className="text-xs text-gray-500"
                >
                  limit {ed.players_limit} ·{' '}
                  {formatDivisionPlayingWindow(
                    ed.playing_starts_at,
                    ed.playing_ends_at
                  )}{' '}
                  · skill_order{' '}
                  {ed.skill_order ?? 0}
                  {ed.level_min != null || ed.level_max != null
                    ? ` · level ${ed.level_min ?? '—'} → ${ed.level_max ?? '—'}`
                    : ''}
                </Text>
              </View>
              <View className="flex-row items-center">
                {!eventFinalized && (
                  <SortableArrows
                    onUp={() => move(index, -1)}
                    onDown={() => move(index, 1)}
                    upTestID={`division-move-up-${ed.id_event_division}`}
                    downTestID={`division-move-down-${ed.id_event_division}`}
                  />
                )}
                <Pressable
                  testID={`division-edit-${ed.id_event_division}`}
                  onPress={() => openEdit(ed)}
                  className="p-2"
                  accessibilityLabel={`Edit ${divisionLabel(ed)} in a new window`}
                >
                  <Ionicons name="open-outline" size={18} color="#2563eb" />
                </Pressable>
                {!eventFinalized && (
                  <DeleteDivisionButton ed={ed} onDeleted={onRefresh} />
                )}
              </View>
            </View>
          </SortableRow>
        ))}
        {local.length === 0 && (
          <Text className="text-sm text-gray-500 p-3">
            No divisions for this event yet.
          </Text>
        )}
      </View>
    </View>
  );
}
