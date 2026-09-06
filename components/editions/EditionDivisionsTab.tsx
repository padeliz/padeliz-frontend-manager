/**
 * Divisions tab: identity-only edition divisions with skill_order reordering.
 * Schedule knobs live on the Schedule tab, not here.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { ApiDivision, ApiEditionDivision } from '@/types/api/entities';
import { confirmAction } from '@/utils/confirmAction';
import { sortBySkillOrder } from '@/utils/edition/editionDivisionOrder';
import { openInNewWindow } from '@/utils/openInNewWindow';
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

const editionDivisionsApi = new EditionDivisionsApiService();

const ROW_HEIGHT = 56;

type Props = {
  editionId: number;
  editionFinalized: boolean;
  divisions: ApiEditionDivision[];
  catalogDivisions: ApiDivision[];
  onRefresh: () => Promise<void>;
};

type NewDivisionDraft = {
  division_id: number | null;
  division_title: string;
  players_limit: string;
  playing_start_time: string;
  playing_end_time: string;
};

const EMPTY_DRAFT: NewDivisionDraft = {
  division_id: null,
  division_title: '',
  players_limit: '16',
  playing_start_time: '10:00',
  playing_end_time: '18:00',
};

export function divisionLabel(ed: ApiEditionDivision): string {
  return (
    ed.division_title || ed.division?.name || `ED #${ed.id_edition_division}`
  );
}

function DeleteDivisionButton({
  ed,
  onDeleted,
}: {
  ed: ApiEditionDivision;
  onDeleted: () => Promise<void>;
}) {
  const { status, errorMessage, run } = useActionButtonStatus({
    auditoryFeedback: true,
    successHoldMs: 4000,
  });

  return (
    <ActionButton
      testID={`division-delete-${ed.id_edition_division}`}
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
          'Delete edition division',
          `Delete ${divisionLabel(ed)}? Participations and schedule for it are removed too.`,
          () => {
            void run(async () => {
              await editionDivisionsApi.deleteEditionDivision(
                ed.id_edition_division
              );
              await onDeleted();
            });
          }
        );
      }}
    />
  );
}

export default function EditionDivisionsTab({
  editionId,
  editionFinalized,
  divisions,
  catalogDivisions,
  onRefresh,
}: Props) {
  const router = useRouter();
  const [local, setLocal] = useState<ApiEditionDivision[]>(() =>
    sortBySkillOrder(divisions)
  );
  const [draft, setDraft] = useState<NewDivisionDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const createStatus = useActionButtonStatus({ auditoryFeedback: true });

  useEffect(() => {
    setLocal(sortBySkillOrder(divisions));
  }, [divisions]);

  const orderDirty = useMemo(() => {
    const original = sortBySkillOrder(divisions).map(d => d.id_edition_division);
    return local.some((d, i) => d.id_edition_division !== original[i]);
  }, [divisions, local]);

  const catalogOptions = useMemo(() => {
    const taken = new Set(divisions.map(d => d.division_id));
    return catalogDivisions
      .filter(d => !taken.has(d.id_division))
      .map(d => ({ label: `${d.name} (#${d.id_division})`, value: d.id_division }));
  }, [catalogDivisions, divisions]);

  const pickDivision = (divisionId: number) => {
    const picked = catalogDivisions.find(d => d.id_division === divisionId);
    setDraft(prev => ({
      ...prev,
      division_id: divisionId,
      division_title:
        prev.division_title.trim() === '' ? picked?.name || '' : prev.division_title,
    }));
  };

  const move = (index: number, dir: -1 | 1) => {
    if (editionFinalized) return;
    const next = moveInList(local, index, dir);
    if (next) setLocal(next);
  };

  const reorder = (from: number, to: number) => {
    if (editionFinalized) return;
    const next = reorderList(local, from, to);
    if (next) setLocal(next);
  };

  const saveOrder = useCallback(async () => {
    if (editionFinalized || !orderDirty) return;
    setSaving(true);
    try {
      await editionDivisionsApi.reorderEditionDivisions(
        editionId,
        local.map((d, i) => ({
          id_edition_division: d.id_edition_division,
          skill_order: i,
        }))
      );
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }, [editionFinalized, editionId, local, onRefresh, orderDirty]);

  useRegisterPageActions({
    save: saveOrder,
    refresh: onRefresh,
    canSave: orderDirty && !editionFinalized,
    isDirty: orderDirty && !editionFinalized,
    isSaving: saving,
  });

  const create = () => {
    if (editionFinalized) return;
    void createStatus.run(async () => {
      if (draft.division_id == null) {
        throw new Error('Select a division from the catalog.');
      }
      const playersLimit = Number(draft.players_limit);
      if (!Number.isFinite(playersLimit) || playersLimit < 1) {
        throw new Error('Players limit must be a positive number.');
      }
      await editionDivisionsApi.createEditionDivision({
        edition_id: editionId,
        division_id: draft.division_id,
        division_title: draft.division_title.trim() || undefined,
        players_limit: playersLimit,
        playing_start_time: draft.playing_start_time,
        playing_end_time: draft.playing_end_time,
      });
      setDraft(EMPTY_DRAFT);
      await onRefresh();
    });
  };

  const openEdit = (ed: ApiEditionDivision) => {
    const href = `/edition-divisions/${ed.id_edition_division}`;
    openInNewWindow(href, () => router.push(href as any));
  };

  return (
    <View testID="edition-divisions-tab">
      <Text className="text-lg font-semibold text-gray-900 mb-3">Divisions</Text>

      {editionFinalized && (
        <Text
          testID="divisions-finalized-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3"
        >
          Edition is finalized — divisions are read-only.
        </Text>
      )}

      {!editionFinalized && (
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
              <Text className="text-xs text-gray-500 mb-1">Start (HH:MM)</Text>
              <AppTextInput
                testID="divisions-start-input"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.playing_start_time}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, playing_start_time: v }))
                }
              />
            </View>
            <View style={{ minWidth: 110 }}>
              <Text className="text-xs text-gray-500 mb-1">End (HH:MM)</Text>
              <AppTextInput
                testID="divisions-end-input"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.playing_end_time}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, playing_end_time: v }))
                }
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
            key={ed.id_edition_division}
            index={index}
            count={local.length}
            locked={editionFinalized}
            rowHeight={ROW_HEIGHT}
            onReorder={reorder}
          >
            <View
              testID={`division-row-${ed.id_edition_division}`}
              className="flex-row flex-wrap items-center px-3 py-2 border-b border-gray-100"
            >
              {!editionFinalized && (
                <SortableDragHandle
                  testID={`division-drag-handle-${ed.id_edition_division}`}
                />
              )}
              {ed.division?.color ? (
                <View
                  testID={`division-color-${ed.id_edition_division}`}
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
                  testID={`division-meta-${ed.id_edition_division}`}
                  className="text-xs text-gray-500"
                >
                  limit {ed.players_limit} · {ed.playing_start_time || '—'} –{' '}
                  {ed.playing_end_time || '—'} · skill_order{' '}
                  {ed.skill_order ?? 0}
                </Text>
              </View>
              <View className="flex-row items-center">
                {!editionFinalized && (
                  <SortableArrows
                    onUp={() => move(index, -1)}
                    onDown={() => move(index, 1)}
                    upTestID={`division-move-up-${ed.id_edition_division}`}
                    downTestID={`division-move-down-${ed.id_edition_division}`}
                  />
                )}
                <Pressable
                  testID={`division-edit-${ed.id_edition_division}`}
                  onPress={() => openEdit(ed)}
                  className="p-2"
                  accessibilityLabel={`Edit ${divisionLabel(ed)} in a new window`}
                >
                  <Ionicons name="open-outline" size={18} color="#2563eb" />
                </Pressable>
                {!editionFinalized && (
                  <DeleteDivisionButton ed={ed} onDeleted={onRefresh} />
                )}
              </View>
            </View>
          </SortableRow>
        ))}
        {local.length === 0 && (
          <Text className="text-sm text-gray-500 p-3">
            No divisions for this edition yet.
          </Text>
        )}
      </View>
    </View>
  );
}
