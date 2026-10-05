/**
 * Participations tab: players per ED with arrows + drag-and-drop reorder/move.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import CachedPdfImageReload from '@/components/events/CachedPdfImageReload';
import ActionButton from '@/components/ui/ActionButton';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import EllipsisText from '@/components/ui/EllipsisText';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { useCachedPdfAvatarReload } from '@/hooks/useCachedPdfAvatarReload';
import { usePlayerPicker } from '@/hooks/usePlayerPicker';
import { EventParticipationsApiService } from '@/services/api/eventParticipationsApi';
import {
  ApiEventDivision,
  ApiEventParticipation,
} from '@/types/api/entities';
import { confirmAction } from '@/utils/confirmAction';
import { formatDisplayDate } from '@/utils/fieldFormatter';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  applyDrop,
  EdListFrame,
  resolveDropTarget,
} from './eventDivisionsDnD';
import ParticipationFlagBadges from './ParticipationFlagBadges';
import SortableRow, {
  moveInList,
  reorderList,
  SortableArrows,
  SortableDragHandle,
  SORTABLE_ROW_HEIGHT,
} from './SortableRow';
import Tooltip from '@/components/ui/Tooltip';
import { tipBodyNative } from '@/components/ui/tooltipShared';

const participationsApi = new EventParticipationsApiService();

const ROW_HEIGHT = SORTABLE_ROW_HEIGHT;

const COLLECTING_POINTS_TOOLTIP =
  'If player is collecting points from the matches and they appear on the Ranking poster.';

const OVER_LIMIT_TOOLTIP =
  'This division exceeds the participants limit.';

/** Fixed column widths for the per-ED participations table. */
const COL = {
  handle: 28,
  avatar: 36,
  name: 160,
  collecting: 44,
  flags: 72,
  played: 140,
  participated: 180,
  customField: 128,
  arrows: 72,
  exclude: 36,
} as const;

/** Shared gutter between every column (header + rows). */
const COL_GUTTER = 8;

const LEFT_COL_COUNT = 5;
const LEFT_COLS_WIDTH =
  COL.handle +
  COL.avatar +
  COL.name +
  COL.collecting +
  COL.flags +
  (LEFT_COL_COUNT - 1) * COL_GUTTER;

const TRAILING_COLS_WIDTH = COL.arrows + COL.exclude + COL_GUTTER;

type Props = {
  eventId: number;
  eventFinalized: boolean;
  divisions: ApiEventDivision[];
  participations: ApiEventParticipation[];
  selectedDivisionId: number | null;
  registeredNotParticipatingCount?: number;
  participationsLocked?: boolean;
  customFieldOptions?: Array<{ label: string; value: number }>;
  selectedCustomFieldIds?: number[];
  onCustomFieldSelectionChange?: (ids: number[]) => void;
  onRefresh: () => Promise<void>;
};

function playerLabel(p: ApiEventParticipation): string {
  const pl = (p as any).player;
  return (
    pl?.name ||
    [pl?.first_name, pl?.last_name].filter(Boolean).join(' ') ||
    `Player #${p.player_id}`
  );
}

function timesLabel(n: number): string {
  return n === 1 ? '1 time' : `${n} times`;
}

function divisionTitleStyle(color: string | undefined | null) {
  const trimmed = color != null ? String(color).trim() : '';
  return {
    fontWeight: '700' as const,
    ...(trimmed !== '' ? { color: trimmed } : {}),
  };
}

function playedRankLabel(rank: number | null | undefined, count: number): string {
  const rankText = rank == null ? '—' : String(rank);
  return `${rankText}/${count}`;
}

function PlayedHistoryCell({ p }: { p: ApiEventParticipation }) {
  const h = p.player_history;
  const last = h?.last_played ?? null;

  const playedHint =
    (h?.played_recent || [])
      .map(entry => {
        const entryRank = entry.rank == null ? '—' : String(entry.rank);
        return `${entry.event_name}: ${entry.division_title} ${entryRank}/${entry.participant_count}`;
      })
      .join('\n') || undefined;

  const playedBody =
    (h?.played_recent || []).length > 0 ? (
      <View>
        {(h?.played_recent || []).map((entry, i) => {
          const entryRank = entry.rank == null ? '—' : String(entry.rank);
          return (
            <Text key={`${entry.event_name}-${i}`} style={tipBodyNative}>
              {entry.event_name}:{' '}
              <Text style={divisionTitleStyle(entry.division_color)}>
                {entry.division_title}
              </Text>{' '}
              {entryRank}/{entry.participant_count}
            </Text>
          );
        })}
      </View>
    ) : null;

  const cell = last ? (
    <Text
      numberOfLines={1}
      ellipsizeMode="tail"
      className="text-xs text-gray-500"
    >
      <Text
        testID={`history-division-title-${p.id_participation}`}
        className="font-bold"
        style={divisionTitleStyle(last.division_color)}
      >
        {last.division_title}
      </Text>{' '}
      {playedRankLabel(last.rank, last.participant_count)}
    </Text>
  ) : (
    <Text
      testID={`history-played-empty-${p.id_participation}`}
      className="text-xs text-gray-500"
    >
      —
    </Text>
  );

  return (
    <View
      testID={`history-played-${p.id_participation}`}
      style={{ width: COL.played }}
      className="justify-center"
    >
      {playedBody ? (
        <Tooltip
          title="Played"
          content={playedBody}
          accessibilityHint={
            playedHint ? `Played\n${playedHint}` : 'Played'
          }
          testID={`history-tooltip-played-${p.id_participation}`}
        >
          <View collapsable={false}>{cell}</View>
        </Tooltip>
      ) : (
        cell
      )}
    </View>
  );
}

function ParticipatedHistoryCell({ p }: { p: ApiEventParticipation }) {
  const h = p.player_history;
  const participatedCount = h?.participated_count ?? 0;
  const bannedCount = h?.banned_count ?? 0;
  const absentedCount = h?.absented_count ?? 0;

  const participatedBody = (h?.participated_tooltip?.lines || [])
    .map(line =>
      line.type === 'ellipsis'
        ? '...'
        : `${line.event_name}: ${formatDisplayDate(line.date)}`
    )
    .join('\n');

  const bannedBody = (h?.banned_recent || [])
    .map(
      entry =>
        `${entry.event_name}: ${formatDisplayDate(entry.date)} (${entry.ban_reason})`
    )
    .join('\n');

  const absentedBody = (h?.absented_recent || [])
    .map(
      entry =>
        `${entry.event_name}: ${formatDisplayDate(entry.date)} (${entry.absence_reason})`
    )
    .join('\n');

  const participatedNode =
    participatedCount > 0 ? (
      <Text
        testID={`history-times-participated-${p.id_participation}`}
        className="text-xs text-gray-500 font-bold"
      >
        {timesLabel(participatedCount)}
      </Text>
    ) : (
      <Text
        testID={`history-times-participated-${p.id_participation}`}
        className="text-xs text-gray-500"
      >
        —
      </Text>
    );

  return (
    <View
      testID={`player-history-${p.id_participation}`}
      style={{ width: COL.participated }}
      className="flex-row items-center"
    >
      {participatedCount > 0 && participatedBody ? (
        <Tooltip
          title="Participated"
          content={participatedBody}
          testID={`history-tooltip-participated-${p.id_participation}`}
        >
          <View collapsable={false}>{participatedNode}</View>
        </Tooltip>
      ) : (
        participatedNode
      )}
      {bannedCount > 0 ? (
        <>
          <Text className="text-xs text-gray-500">{' • '}</Text>
          {bannedBody ? (
            <Tooltip
              title="Banned"
              content={bannedBody}
              testID={`history-tooltip-banned-${p.id_participation}`}
            >
              <Text className="text-xs text-gray-500">
                Banned{' '}
                <Text
                  testID={`history-times-banned-${p.id_participation}`}
                  className="font-bold"
                >
                  {timesLabel(bannedCount)}
                </Text>
              </Text>
            </Tooltip>
          ) : (
            <Text className="text-xs text-gray-500">
              Banned{' '}
              <Text
                testID={`history-times-banned-${p.id_participation}`}
                className="font-bold"
              >
                {timesLabel(bannedCount)}
              </Text>
            </Text>
          )}
        </>
      ) : null}
      {absentedCount > 0 ? (
        <>
          <Text className="text-xs text-gray-500">{' • '}</Text>
          {absentedBody ? (
            <Tooltip
              title="Absented"
              content={absentedBody}
              testID={`history-tooltip-absented-${p.id_participation}`}
            >
              <Text className="text-xs text-gray-500">
                Absented{' '}
                <Text
                  testID={`history-times-absented-${p.id_participation}`}
                  className="font-bold"
                >
                  {timesLabel(absentedCount)}
                </Text>
              </Text>
            </Tooltip>
          ) : (
            <Text className="text-xs text-gray-500">
              Absented{' '}
              <Text
                testID={`history-times-absented-${p.id_participation}`}
                className="font-bold"
              >
                {timesLabel(absentedCount)}
              </Text>
            </Text>
          )}
        </>
      ) : null}
    </View>
  );
}

function recentAnswersTooltipBody(
  answers: NonNullable<
    NonNullable<ApiEventParticipation['custom_field_values']>[number]['recent_answers']
  >
): string {
  return answers
    .map(answer =>
      answer.event_name != null
        ? `(${answer.event_name}) ${answer.value}`
        : `(${formatDisplayDate(answer.inserted_date)}) ${answer.value}`
    )
    .join('\n');
}

function CustomFieldCell({
  p,
  fieldId,
  label,
}: {
  p: ApiEventParticipation;
  fieldId: number;
  label: string;
}) {
  const entry = (p.custom_field_values || []).find(v => v.field_id === fieldId);
  const tipBody = entry
    ? recentAnswersTooltipBody(entry.recent_answers || [])
    : '';

  return (
    <View style={{ width: COL.customField }} className="justify-center">
      {entry ? (
        <EllipsisText
          className="text-xs text-gray-500"
          maxWidth={COL.customField}
          tooltip={tipBody || undefined}
          tooltipTitle={tipBody ? label : undefined}
          testID={`custom-field-value-${p.id_participation}-${fieldId}`}
        >
          {entry.value}
        </EllipsisText>
      ) : (
        <Text
          testID={`custom-field-empty-${p.id_participation}-${fieldId}`}
          className="text-xs text-gray-400"
        />
      )}
    </View>
  );
}

function Cell({
  width,
  children,
  className = '',
}: {
  width: number;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <View style={{ width }} className={`justify-center ${className}`.trim()}>
      {children}
    </View>
  );
}

function TableColSpacer() {
  return <View testID="ed-table-col-spacer" style={{ flex: 1, minWidth: 0 }} />;
}

function ExcludeParticipationButton({
  p,
  onExcluded,
}: {
  p: ApiEventParticipation;
  onExcluded: () => Promise<void>;
}) {
  const { status, errorMessage, run } = useActionButtonStatus({
    auditoryFeedback: true,
    successHoldMs: 4000,
  });

  return (
    <ActionButton
      testID={`exclude-participation-${p.id_participation}`}
      label="Exclude"
      startIcon="remove-circle-outline"
      accessibilityLabel={`Exclude ${playerLabel(p)}`}
      variant="secondary"
      size="sm"
      iconColor="#dc2626"
      status={status}
      errorMessage={errorMessage ?? undefined}
      className="p-2 flex-row items-center"
      onPress={() => {
        confirmAction(
          'Exclude player',
          `Exclude ${playerLabel(p)} from participations?`,
          () => {
            void run(async () => {
              await participationsApi.deleteParticipation(p.id_participation);
              await onExcluded();
            });
          }
        );
      }}
    />
  );
}

/**
 * Same-ED reordering is the shared primitive; when the "General" ED view is
 * active a drop can also land in another ED's list, which needs the measured
 * list frames instead of a plain row offset.
 */
function ParticipationSortableRow({
  index,
  count,
  locked,
  crossEdEnabled,
  listY,
  frames,
  edId,
  onSameEdReorder,
  onCrossDrop,
  children,
}: {
  index: number;
  count: number;
  locked: boolean;
  crossEdEnabled: boolean;
  listY: number;
  frames: EdListFrame[];
  edId: number;
  onSameEdReorder: (from: number, to: number) => void;
  onCrossDrop: (
    fromEd: number,
    fromIndex: number,
    targetEd: number,
    toIndex: number
  ) => void;
  children: React.ReactNode;
}) {
  const crossDrop = (translationY: number) => {
    const absoluteY =
      listY + index * ROW_HEIGHT + translationY + ROW_HEIGHT / 2;
    const target = resolveDropTarget(frames, absoluteY, ROW_HEIGHT);
    if (target && (target.targetEdId !== edId || target.index !== index)) {
      onCrossDrop(edId, index, target.targetEdId, target.index);
    }
  };

  return (
    <SortableRow
      index={index}
      count={count}
      locked={locked}
      rowHeight={ROW_HEIGHT}
      onReorder={onSameEdReorder}
      onDragEnd={crossEdEnabled ? crossDrop : undefined}
    >
      {children}
    </SortableRow>
  );
}

export default function EventParticipationsTab({
  eventId,
  eventFinalized,
  divisions,
  participations,
  selectedDivisionId,
  registeredNotParticipatingCount = 0,
  participationsLocked = false,
  customFieldOptions = [],
  selectedCustomFieldIds = [],
  onCustomFieldSelectionChange,
  onRefresh,
}: Props) {
  const [local, setLocal] = useState(participations);
  const [saving, setSaving] = useState(false);
  const addStatus = useActionButtonStatus({ auditoryFeedback: true });
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [targetEdId, setTargetEdId] = useState<number | null>(
    selectedDivisionId
  );
  const [frames, setFrames] = useState<EdListFrame[]>([]);
  const listHosts = useRef(new Map<number, View | null>());
  const {
    spinning: avatarSpinning,
    errors: avatarErrors,
    urlFor: avatarUrlFor,
    reload: reloadAvatar,
  } = useCachedPdfAvatarReload();

  useEffect(() => {
    setLocal(participations);
  }, [participations]);

  useEffect(() => {
    setTargetEdId(selectedDivisionId);
  }, [selectedDivisionId]);

  const playerPicker = usePlayerPicker({
    preloadCount: 100,
    selectedValue: playerId,
  });

  const visibleDivisions = useMemo(() => {
    if (selectedDivisionId == null) return divisions;
    return divisions.filter(d => d.id_event_division === selectedDivisionId);
  }, [divisions, selectedDivisionId]);

  const byEd = useMemo(() => {
    const map = new Map<number, ApiEventParticipation[]>();
    for (const ed of visibleDivisions) {
      map.set(ed.id_event_division, []);
    }
    for (const p of local) {
      const list = map.get(p.event_division_id as number);
      if (list) list.push(p);
    }
    for (const [, list] of map) {
      list.sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.id_participation - b.id_participation
      );
    }
    return map;
  }, [local, visibleDivisions]);

  const measureFrames = useCallback(() => {
    const next: EdListFrame[] = [];
    let pending = visibleDivisions.length;
    if (pending === 0) {
      setFrames([]);
      return;
    }
    for (const ed of visibleDivisions) {
      const edId = ed.id_event_division;
      const node = listHosts.current.get(edId) as any;
      const count = (byEd.get(edId) || []).length;
      if (node?.measureInWindow) {
        node.measureInWindow((x: number, y: number, w: number, h: number) => {
          next.push({
            edId,
            y,
            height: Math.max(h, ROW_HEIGHT),
            count,
          });
          pending -= 1;
          if (pending === 0) {
            setFrames(next);
          }
        });
      } else {
        pending -= 1;
        if (pending === 0) {
          setFrames(next);
        }
      }
    }
  }, [byEd, visibleDivisions]);

  useEffect(() => {
    measureFrames();
  }, [measureFrames, local]);

  const edOptions = useMemo(
    () =>
      divisions.map(d => ({
        label: d.division_title || `ED #${d.id_event_division}`,
        value: d.id_event_division,
      })),
    [divisions]
  );

  const applyList = useCallback((edId: number, list: ApiEventParticipation[]) => {
    const reindexed = list.map((p, i) => ({ ...p, sort_order: i }));
    setLocal(prev => {
      const others = prev.filter(p => p.event_division_id !== edId);
      return [...others, ...reindexed];
    });
  }, []);

  const moveWithin = (edId: number, index: number, dir: -1 | 1) => {
    if (eventFinalized) return;
    const next = moveInList(byEd.get(edId) || [], index, dir);
    if (next) applyList(edId, next);
  };

  const reorderAt = (edId: number, from: number, to: number) => {
    if (eventFinalized) return;
    const next = reorderList(byEd.get(edId) || [], from, to);
    if (next) applyList(edId, next);
  };

  const onDrop = (
    fromEd: number,
    fromIndex: number,
    targetEd: number,
    toIndex: number
  ) => {
    if (eventFinalized) return;
    if (fromEd === targetEd) {
      // toIndex from resolveDropTarget is [0, count]; convert to reorder index
      const listLen = (byEd.get(fromEd) || []).length;
      let to = Math.min(toIndex, listLen - 1);
      if (toIndex >= listLen) to = listLen - 1;
      if (to === fromIndex || to < 0) return;
      reorderAt(fromEd, fromIndex, to);
      return;
    }
    setLocal(prev => applyDrop(prev, fromEd, fromIndex, targetEd, toIndex));
  };

  const onAdd = () => {
    if (eventFinalized) return;
    void addStatus.run(async () => {
      const edId = selectedDivisionId ?? targetEdId;
      if (playerId == null || edId == null) {
        throw new Error('Select a player and event division.');
      }
      await participationsApi.createParticipation({
        event_id: eventId,
        event_division_id: edId,
        player_id: playerId,
      });
      setPlayerId(null);
      if (selectedDivisionId == null) setTargetEdId(null);
      await onRefresh();
    });
  };

  const originalById = useMemo(
    () => new Map(participations.map(p => [p.id_participation, p])),
    [participations]
  );

  const orderDirty = useMemo(() => {
    return local.some(p => {
      const orig = originalById.get(p.id_participation);
      if (!orig) return true;
      return (
        orig.event_division_id !== p.event_division_id ||
        (orig.sort_order ?? 0) !== (p.sort_order ?? 0)
      );
    });
  }, [local, originalById]);

  const collectingDirty = useMemo(() => {
    return local.some(p => {
      const orig = originalById.get(p.id_participation);
      if (!orig) return false;
      return !!orig.is_collecting_points !== !!p.is_collecting_points;
    });
  }, [local, originalById]);

  const isDirty = orderDirty || collectingDirty;

  const toggleCollecting = (p: ApiEventParticipation) => {
    if (eventFinalized) return;
    setLocal(prev =>
      prev.map(row =>
        row.id_participation === p.id_participation
          ? { ...row, is_collecting_points: !row.is_collecting_points }
          : row
      )
    );
  };

  const save = useCallback(async () => {
    if (eventFinalized) return;
    setSaving(true);
    try {
      const origById = new Map(
        participations.map(p => [p.id_participation, p])
      );
      const affected = local.filter(p => {
        const orig = origById.get(p.id_participation);
        if (!orig) return true;
        return (
          orig.event_division_id !== p.event_division_id ||
          (orig.sort_order ?? 0) !== (p.sort_order ?? 0)
        );
      });
      const collectingChanged = local.filter(p => {
        const orig = origById.get(p.id_participation);
        if (!orig) return false;
        return !!orig.is_collecting_points !== !!p.is_collecting_points;
      });

      if (affected.length > 0) {
        const touchedEds = new Set(affected.map(p => p.event_division_id!));
        for (const p of local) {
          const orig = origById.get(p.id_participation);
          if (orig && orig.event_division_id !== p.event_division_id) {
            touchedEds.add(orig.event_division_id!);
          }
        }
        const payload: Array<{
          id_participation: number;
          event_division_id: number;
          sort_order: number;
        }> = [];
        for (const edId of touchedEds) {
          const list = local
            .filter(p => p.event_division_id === edId)
            .sort(
              (a, b) =>
                (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
                a.id_participation - b.id_participation
            );
          list.forEach((p, i) => {
            payload.push({
              id_participation: p.id_participation,
              event_division_id: edId,
              sort_order: i,
            });
          });
        }
        await participationsApi.reorderParticipations(payload);
      }

      for (const p of collectingChanged) {
        await participationsApi.updateParticipation(p.id_participation, {
          event_id: p.event_id,
          event_division_id: p.event_division_id,
          player_id: p.player_id,
          is_collecting_points: !!p.is_collecting_points,
        });
      }

      if (affected.length > 0 || collectingChanged.length > 0) {
        await onRefresh();
      }
    } finally {
      setSaving(false);
    }
  }, [eventFinalized, local, onRefresh, participations]);

  useRegisterPageActions({
    save,
    refresh: onRefresh,
    canSave: isDirty && !eventFinalized,
    isDirty: isDirty && !eventFinalized,
    isSaving: saving,
  });

  const crossEdEnabled = selectedDivisionId == null && !eventFinalized;

  const customFieldColumns = useMemo(() => {
    return selectedCustomFieldIds.map(id => {
      const opt = customFieldOptions.find(o => Number(o.value) === Number(id));
      return {
        fieldId: Number(id),
        label: opt?.label ?? `Field #${id}`,
      };
    });
  }, [customFieldOptions, selectedCustomFieldIds]);

  return (
    <View>
      <Text className="text-lg font-semibold text-gray-900 mb-3">
        Participations
      </Text>

      {eventFinalized && (
        <Text
          testID="participations-finalized-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3"
        >
          Event is finalized — participations are read-only.
        </Text>
      )}

      {participationsLocked && !eventFinalized && (
        <Text
          testID="participations-lottery-lock-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3"
        >
          Lottery draws exist for this event — players cannot be excluded.
        </Text>
      )}

      {selectedDivisionId == null && registeredNotParticipatingCount > 0 && (
        <Text
          testID="registered-not-participating-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3"
        >
          {registeredNotParticipatingCount === 1
            ? '1 registered player is not participating.'
            : `${registeredNotParticipatingCount} registered players are not participating.`}
        </Text>
      )}

      {!eventFinalized && (
        <View
          testID="participations-add-form-row-outer"
          className="flex-row flex-wrap items-end gap-3 mb-4"
        >
          <View
            testID="participations-add-form"
            className="flex-1 border border-gray-200 rounded-lg p-3 bg-white gap-2"
            style={{ minWidth: 280 }}
          >
            <Text className="font-semibold text-gray-900">Add player</Text>
            <View
              testID="participations-add-form-row"
              className="flex-row flex-wrap items-end gap-2"
            >
              <View testID="participations-player-picker" className="flex-1" style={{ minWidth: 160 }}>
                <SingleSelectDropdown
                  options={playerPicker.options}
                  selectedValue={playerId}
                  onSelectionChange={v => setPlayerId(Number(v))}
                  placeholder="Select player"
                  title="Player"
                  minWidth={160}
                  searchable
                  onSearch={playerPicker.onSearch}
                  loading={playerPicker.loading}
                />
              </View>
              {selectedDivisionId == null && (
                <View className="flex-1" style={{ minWidth: 160 }}>
                  <SingleSelectDropdown
                    options={edOptions}
                    selectedValue={targetEdId}
                    onSelectionChange={v => setTargetEdId(Number(v))}
                    placeholder="Select event division"
                    title="Event division"
                    minWidth={160}
                  />
                </View>
              )}
              <ActionButton
                testID="participations-add-button"
                label="Add"
                variant="primary"
                size="sm"
                status={addStatus.status}
                errorMessage={addStatus.errorMessage ?? undefined}
                onPress={onAdd}
              />
            </View>
          </View>
          {customFieldOptions.length > 0 && (
            <View
              testID="participations-custom-fields-picker"
              className="border border-gray-200 rounded-lg p-3 bg-white gap-2"
              style={{ minWidth: 180 }}
            >
              <Text className="font-semibold text-gray-900">Custom fields</Text>
              <MultiSelectDropdown
                options={customFieldOptions}
                selectedValues={selectedCustomFieldIds}
                onSelectionChange={values =>
                  onCustomFieldSelectionChange?.(
                    values.map(v => Number(v)).filter(Number.isFinite)
                  )
                }
                placeholder="Custom fields"
                title="Custom fields"
                minWidth={180}
              />
            </View>
          )}
        </View>
      )}

      {eventFinalized && customFieldOptions.length > 0 && (
        <View
          testID="participations-custom-fields-filter-row"
          className="mb-4 border border-gray-200 rounded-lg p-3 bg-white gap-2"
        >
          <Text className="font-semibold text-gray-900">Custom fields</Text>
          <MultiSelectDropdown
            options={customFieldOptions}
            selectedValues={selectedCustomFieldIds}
            onSelectionChange={values =>
              onCustomFieldSelectionChange?.(
                values.map(v => Number(v)).filter(Number.isFinite)
              )
            }
            placeholder="Custom fields"
            title="Custom fields"
            minWidth={220}
          />
        </View>
      )}

      {visibleDivisions.map(ed => {
        const list = byEd.get(ed.id_event_division) || [];
        const locked = eventFinalized;
        const listFrame = frames.find(f => f.edId === ed.id_event_division);
        const listY = listFrame?.y ?? 0;
        const quantity = list.length;
        const limitRaw = ed.players_limit;
        const limitSet = limitRaw != null && Number.isFinite(Number(limitRaw));
        const limitLabel = limitSet ? String(limitRaw) : '?';
        const overLimit = limitSet && quantity > Number(limitRaw);
        const divisionTitle =
          ed.division_title || `ED #${ed.id_event_division}`;

        return (
          <View
            key={ed.id_event_division}
            testID={`ed-section-${ed.id_event_division}`}
            className="mb-6 border border-gray-200 rounded-lg p-3 bg-white"
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={{ flexGrow: 1 }}
              testID={`ed-table-scroll-${ed.id_event_division}`}
            >
              <View
                testID={`ed-table-${ed.id_event_division}`}
                style={{ minWidth: '100%' }}
              >
                <View
                  testID={`ed-table-header-${ed.id_event_division}`}
                  className="flex-row items-center border-b border-gray-200 pb-2 mb-1"
                  style={{ gap: COL_GUTTER }}
                >
                  <View
                    style={{ width: LEFT_COLS_WIDTH }}
                    className="flex-row items-center gap-2"
                  >
                    {ed.division?.color &&
                    String(ed.division.color).trim() !== '' ? (
                      <View
                        testID={`ed-color-${ed.id_event_division}`}
                        style={{
                          width: 12,
                          height: 12,
                          backgroundColor: ed.division.color,
                        }}
                      />
                    ) : (
                      <Text
                        testID={`ed-color-missing-${ed.id_event_division}`}
                      >
                        ⚠️
                      </Text>
                    )}
                    <Text
                      className="font-semibold text-gray-900"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{ flexShrink: 1 }}
                    >
                      {divisionTitle}
                      {locked ? ' (locked)' : ''}
                    </Text>
                    <Text
                      testID={`ed-capacity-${ed.id_event_division}`}
                      className="text-sm text-gray-600"
                    >
                      {quantity}/{limitLabel}
                    </Text>
                    {overLimit ? (
                      <Tooltip
                        content={OVER_LIMIT_TOOLTIP}
                        testID={`ed-over-limit-${ed.id_event_division}`}
                      >
                        <Ionicons
                          name="warning"
                          size={16}
                          color="#d97706"
                        />
                      </Tooltip>
                    ) : null}
                  </View>
                  <TableColSpacer />
                  <Cell width={COL.played}>
                    <Text
                      testID={`ed-col-played-${ed.id_event_division}`}
                      className="text-xs font-semibold text-gray-600"
                    >
                      Played
                    </Text>
                  </Cell>
                  <Cell width={COL.participated}>
                    <Text
                      testID={`ed-col-participated-${ed.id_event_division}`}
                      className="text-xs font-semibold text-gray-600"
                    >
                      Participated
                    </Text>
                  </Cell>
                  {customFieldColumns.map(col => (
                    <Cell key={col.fieldId} width={COL.customField}>
                      <Text
                        testID={`ed-col-custom-${ed.id_event_division}-${col.fieldId}`}
                        className="text-xs font-semibold text-gray-600"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {col.label}
                      </Text>
                    </Cell>
                  ))}
                  <View style={{ width: TRAILING_COLS_WIDTH }} />
                </View>

                <View
                  testID={`ed-list-${ed.id_event_division}`}
                  ref={node => {
                    listHosts.current.set(ed.id_event_division, node);
                  }}
                  onLayout={() => measureFrames()}
                  style={{
                    minHeight: list.length === 0 ? ROW_HEIGHT : undefined,
                  }}
                >
                  {list.map((p, index) => (
                    <ParticipationSortableRow
                      key={p.id_participation}
                      index={index}
                      count={list.length}
                      locked={locked}
                      crossEdEnabled={crossEdEnabled}
                      listY={listY}
                      frames={frames}
                      edId={ed.id_event_division}
                      onSameEdReorder={(from, to) =>
                        reorderAt(ed.id_event_division, from, to)
                      }
                      onCrossDrop={onDrop}
                    >
                      <View
                        testID={`participation-row-${p.id_participation}`}
                        className={`flex-row items-center border-b border-gray-100${
                          index % 2 === 1 ? ' bg-gray-50' : ''
                        }`}
                        style={{ height: ROW_HEIGHT, gap: COL_GUTTER }}
                      >
                        <Cell width={COL.handle}>
                          {!locked ? (
                            <SortableDragHandle
                              testID={`drag-handle-${p.id_participation}`}
                            />
                          ) : null}
                        </Cell>
                        <Cell width={COL.avatar} className="items-center">
                          <CachedPdfImageReload
                            testIdPrefix={`participation-avatar-${p.id_participation}`}
                            imageUrl={avatarUrlFor(
                              p.id_participation,
                              p.pdf_avatar_url ?? null
                            )}
                            size={28}
                            spinning={Boolean(
                              avatarSpinning[p.id_participation]
                            )}
                            errorReason={
                              avatarErrors[p.id_participation] || null
                            }
                            onReload={() =>
                              void reloadAvatar({
                                key: p.id_participation,
                                playerId: Number(p.player_id),
                                collecting: Boolean(p.is_collecting_points),
                              })
                            }
                          />
                        </Cell>
                        <Cell width={COL.name}>
                          <EllipsisText
                            className="text-gray-800"
                            maxWidth={COL.name}
                            testID={`participation-name-${p.id_participation}`}
                          >
                            {playerLabel(p)}
                          </EllipsisText>
                        </Cell>
                        <Cell width={COL.collecting}>
                          <View className="flex-row items-center">
                            <Pressable
                              testID={`collecting-points-${p.id_participation}`}
                              accessibilityLabel="Collecting points"
                              onPress={() => toggleCollecting(p)}
                              className="flex-row items-center"
                            >
                              <Ionicons
                                name={
                                  p.is_collecting_points
                                    ? 'checkbox'
                                    : 'square-outline'
                                }
                                size={18}
                                color={locked ? '#9ca3af' : '#6b7280'}
                              />
                            </Pressable>
                            <Tooltip
                              content={COLLECTING_POINTS_TOOLTIP}
                              testID={`collecting-points-tip-${p.id_participation}`}
                            >
                              <Ionicons
                                name="albums-outline"
                                size={16}
                                color={locked ? '#9ca3af' : '#6b7280'}
                                style={{ marginLeft: 4 }}
                              />
                            </Tooltip>
                          </View>
                        </Cell>
                        <Cell width={COL.flags} className="overflow-hidden">
                          <ParticipationFlagBadges
                            flags={p.flags}
                            participationId={p.id_participation}
                          />
                        </Cell>
                        <TableColSpacer />
                        <PlayedHistoryCell p={p} />
                        <ParticipatedHistoryCell p={p} />
                        {customFieldColumns.map(col => (
                          <CustomFieldCell
                            key={col.fieldId}
                            p={p}
                            fieldId={col.fieldId}
                            label={col.label}
                          />
                        ))}
                        <Cell width={COL.arrows} className="flex-row items-center">
                          {!locked ? (
                            <View className="flex-row items-center">
                              <SortableArrows
                                onUp={() =>
                                  moveWithin(ed.id_event_division, index, -1)
                                }
                                onDown={() =>
                                  moveWithin(ed.id_event_division, index, 1)
                                }
                                upTestID={`move-up-${p.id_participation}`}
                                downTestID={`move-down-${p.id_participation}`}
                              />
                            </View>
                          ) : null}
                        </Cell>
                        <Cell width={COL.exclude}>
                          {!locked && !participationsLocked ? (
                            <ExcludeParticipationButton
                              p={p}
                              onExcluded={onRefresh}
                            />
                          ) : null}
                        </Cell>
                      </View>
                    </ParticipationSortableRow>
                  ))}
                  {list.length === 0 && (
                    <Text className="text-sm text-gray-500 py-2">No players</Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}
