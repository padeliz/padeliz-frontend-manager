/**
 * Divisions tab: players per ED with arrows + drag-and-drop reorder/move.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { usePlayerPicker } from '@/hooks/usePlayerPicker';
import { EditionParticipationsApiService } from '@/services/api/editionParticipationsApi';
import {
  ApiEditionDivision,
  ApiEditionParticipation,
} from '@/types/api/entities';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  applyDrop,
  EdListFrame,
  resolveDropTarget,
} from './editionDivisionsDnD';
import { confirmAction } from './editionLotteryUtils';

const participationsApi = new EditionParticipationsApiService();

const ROW_HEIGHT = 48;

type Props = {
  editionId: number;
  editionFinalized: boolean;
  divisions: ApiEditionDivision[];
  participations: ApiEditionParticipation[];
  selectedDivisionId: number | null;
  onRefresh: () => Promise<void>;
};

function playerLabel(p: ApiEditionParticipation): string {
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

function PlayerHistoryText({ p }: { p: ApiEditionParticipation }) {
  const h = p.player_history;
  if (!h) return null;

  const facts: React.ReactNode[] = [];
  if (h.last_played) {
    const rank =
      h.last_played.rank == null ? '—' : String(h.last_played.rank);
    facts.push(
      <Text key="played">
        Played{' '}
        <Text
          testID={`history-division-title-${p.id_participation}`}
          className="font-bold"
        >
          {h.last_played.division_title}
        </Text>{' '}
        {rank}/{h.last_played.participant_count}
      </Text>
    );
  }
  if (h.participated_count > 0) {
    facts.push(
      <Text key="participated">
        Participated{' '}
        <Text
          testID={`history-times-participated-${p.id_participation}`}
          className="font-bold"
        >
          {timesLabel(h.participated_count)}
        </Text>
      </Text>
    );
  }
  if (h.banned_count > 0) {
    facts.push(
      <Text key="banned">
        Banned{' '}
        <Text
          testID={`history-times-banned-${p.id_participation}`}
          className="font-bold"
        >
          {timesLabel(h.banned_count)}
        </Text>
      </Text>
    );
  }
  if (h.absented_count > 0) {
    facts.push(
      <Text key="absented">
        Absented{' '}
        <Text
          testID={`history-times-absented-${p.id_participation}`}
          className="font-bold"
        >
          {timesLabel(h.absented_count)}
        </Text>
      </Text>
    );
  }
  if (facts.length === 0) return null;

  return (
    <Text
      testID={`player-history-${p.id_participation}`}
      className="text-xs text-gray-500"
    >
      {facts.map((fact, i) => (
        <React.Fragment key={i}>
          {i > 0 ? ' • ' : null}
          {fact}
        </React.Fragment>
      ))}
    </Text>
  );
}

function SortableRow({
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
  const translateY = useSharedValue(0);
  const zIndex = useSharedValue(0);
  const dragging = useSharedValue(0);

  const finishDrop = (translationY: number) => {
    if (crossEdEnabled) {
      const absoluteY =
        listY + index * ROW_HEIGHT + translationY + ROW_HEIGHT / 2;
      const target = resolveDropTarget(frames, absoluteY, ROW_HEIGHT);
      if (
        target &&
        (target.targetEdId !== edId || target.index !== index)
      ) {
        onCrossDrop(edId, index, target.targetEdId, target.index);
      }
      return;
    }
    const delta = Math.round(translationY / ROW_HEIGHT);
    const next = Math.max(0, Math.min(count - 1, index + delta));
    if (next !== index) {
      onSameEdReorder(index, next);
    }
  };

  const gesture = Gesture.Pan()
    .enabled(!locked)
    .activeOffsetY([-8, 8])
    .onStart(() => {
      zIndex.value = 20;
      dragging.value = 1;
    })
    .onUpdate(e => {
      translateY.value = e.translationY;
    })
    .onEnd(e => {
      const ty = e.translationY;
      translateY.value = withSpring(0);
      zIndex.value = 0;
      dragging.value = 0;
      runOnJS(finishDrop)(ty);
    })
    .onFinalize(() => {
      translateY.value = withSpring(0);
      zIndex.value = 0;
      dragging.value = 0;
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: zIndex.value,
    elevation: zIndex.value,
    opacity: dragging.value ? 0.92 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ minHeight: ROW_HEIGHT }, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

export default function EditionDivisionsTab({
  editionId,
  editionFinalized,
  divisions,
  participations,
  selectedDivisionId,
  onRefresh,
}: Props) {
  const [local, setLocal] = useState(participations);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [targetEdId, setTargetEdId] = useState<number | null>(
    selectedDivisionId
  );
  const [frames, setFrames] = useState<EdListFrame[]>([]);
  const listHosts = useRef(new Map<number, View | null>());

  useEffect(() => {
    setLocal(participations);
    setDirty(false);
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
    return divisions.filter(d => d.id_edition_division === selectedDivisionId);
  }, [divisions, selectedDivisionId]);

  const byEd = useMemo(() => {
    const map = new Map<number, ApiEditionParticipation[]>();
    for (const ed of visibleDivisions) {
      map.set(ed.id_edition_division, []);
    }
    for (const p of local) {
      const list = map.get(p.edition_division_id as number);
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
      const edId = ed.id_edition_division;
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
        label: d.division_title || `ED #${d.id_edition_division}`,
        value: d.id_edition_division,
      })),
    [divisions]
  );

  const applyList = useCallback((edId: number, list: ApiEditionParticipation[]) => {
    const reindexed = list.map((p, i) => ({ ...p, sort_order: i }));
    setLocal(prev => {
      const others = prev.filter(p => p.edition_division_id !== edId);
      return [...others, ...reindexed];
    });
    setDirty(true);
  }, []);

  const moveWithin = (edId: number, index: number, dir: -1 | 1) => {
    if (editionFinalized) return;
    const list = [...(byEd.get(edId) || [])];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const tmp = list[index];
    list[index] = list[j];
    list[j] = tmp;
    applyList(edId, list);
  };

  const reorderAt = (edId: number, from: number, to: number) => {
    if (editionFinalized || from === to) return;
    const list = [...(byEd.get(edId) || [])];
    if (from < 0 || from >= list.length || to < 0 || to >= list.length) return;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    applyList(edId, list);
  };

  const onDrop = (
    fromEd: number,
    fromIndex: number,
    targetEd: number,
    toIndex: number
  ) => {
    if (editionFinalized) return;
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
    setDirty(true);
  };

  const onDelete = (p: ApiEditionParticipation) => {
    if (editionFinalized) return;
    confirmAction(
      'Delete participation',
      `Remove ${playerLabel(p)} from this division?`,
      async () => {
        try {
          await participationsApi.deleteParticipation(p.id_participation);
          await onRefresh();
        } catch (e: any) {
          Alert.alert('Delete failed', e?.message || 'Unknown error');
        }
      }
    );
  };

  const onAdd = async () => {
    if (editionFinalized) return;
    const edId = selectedDivisionId ?? targetEdId;
    if (playerId == null || edId == null) {
      setAddError('Select a player and edition division.');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await participationsApi.createParticipation({
        edition_id: editionId,
        edition_division_id: edId,
        player_id: playerId,
      });
      setPlayerId(null);
      if (selectedDivisionId == null) setTargetEdId(null);
      await onRefresh();
    } catch (e: any) {
      setAddError(e?.message || 'Failed to add player');
    } finally {
      setAdding(false);
    }
  };

  const save = useCallback(async () => {
    if (editionFinalized) return;
    setSaving(true);
    try {
      const originalById = new Map(
        participations.map(p => [p.id_participation, p])
      );
      const affected = local.filter(p => {
        const orig = originalById.get(p.id_participation);
        if (!orig) return true;
        return (
          orig.edition_division_id !== p.edition_division_id ||
          (orig.sort_order ?? 0) !== (p.sort_order ?? 0)
        );
      });
      if (affected.length === 0) {
        setDirty(false);
        return;
      }
      const touchedEds = new Set(affected.map(p => p.edition_division_id!));
      for (const p of local) {
        const orig = originalById.get(p.id_participation);
        if (orig && orig.edition_division_id !== p.edition_division_id) {
          touchedEds.add(orig.edition_division_id!);
        }
      }
      const payload: Array<{
        id_participation: number;
        edition_division_id: number;
        sort_order: number;
      }> = [];
      for (const edId of touchedEds) {
        const list = local
          .filter(p => p.edition_division_id === edId)
          .sort(
            (a, b) =>
              (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
              a.id_participation - b.id_participation
          );
        list.forEach((p, i) => {
          payload.push({
            id_participation: p.id_participation,
            edition_division_id: edId,
            sort_order: i,
          });
        });
      }
      await participationsApi.reorderParticipations(payload);
      setDirty(false);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  }, [editionFinalized, local, onRefresh, participations]);

  useRegisterPageActions({
    save,
    refresh: onRefresh,
    canSave: dirty && !editionFinalized,
    isDirty: dirty && !editionFinalized,
    isSaving: saving,
  });

  const crossEdEnabled = selectedDivisionId == null && !editionFinalized;

  return (
    <View>
      <Text className="text-lg font-semibold text-gray-900 mb-3">
        Divisions & players
      </Text>

      {editionFinalized && (
        <Text
          testID="divisions-finalized-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3"
        >
          Edition is finalized — participations are read-only.
        </Text>
      )}

      {!editionFinalized && (
        <View
          testID="divisions-add-form"
          className="mb-4 border border-gray-200 rounded-lg p-3 bg-white gap-2"
        >
          <Text className="font-semibold text-gray-900">Add player</Text>
          <View
            testID="divisions-add-form-row"
            className="flex-row flex-wrap items-end gap-2"
          >
            <View testID="divisions-player-picker" className="flex-1" style={{ minWidth: 160 }}>
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
                  placeholder="Select edition division"
                  title="Edition division"
                  minWidth={160}
                />
              </View>
            )}
            <Pressable
              testID="divisions-add-button"
              disabled={adding}
              onPress={() => void onAdd()}
              className={`px-3 py-2 rounded-lg ${
                adding ? 'bg-gray-300' : 'bg-blue-600'
              }`}
            >
              <Text className="text-white text-sm font-medium">
                {adding ? 'Adding…' : 'Add'}
              </Text>
            </Pressable>
          </View>
          {addError && (
            <Text className="text-sm text-red-600">{addError}</Text>
          )}
        </View>
      )}

      {visibleDivisions.map(ed => {
        const list = byEd.get(ed.id_edition_division) || [];
        const locked = editionFinalized;
        const listFrame = frames.find(f => f.edId === ed.id_edition_division);
        const listY = listFrame?.y ?? 0;
        return (
          <View
            key={ed.id_edition_division}
            testID={`ed-section-${ed.id_edition_division}`}
            className="mb-6 border border-gray-200 rounded-lg p-3 bg-white"
          >
            <View className="flex-row items-center gap-2 mb-2">
              {ed.division?.color &&
              String(ed.division.color).trim() !== '' ? (
                <View
                  testID={`ed-color-${ed.id_edition_division}`}
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: ed.division.color,
                  }}
                />
              ) : (
                <Text testID={`ed-color-missing-${ed.id_edition_division}`}>
                  ⚠️
                </Text>
              )}
              <Text className="font-semibold text-gray-900 flex-1">
                {ed.division_title || `ED #${ed.id_edition_division}`}
                {locked ? ' (locked)' : ''}
              </Text>
            </View>
            <View
              testID={`ed-list-${ed.id_edition_division}`}
              ref={node => {
                listHosts.current.set(ed.id_edition_division, node);
              }}
              onLayout={() => measureFrames()}
              style={{ minHeight: list.length === 0 ? ROW_HEIGHT : undefined }}
            >
              {list.map((p, index) => (
                <SortableRow
                  key={p.id_participation}
                  index={index}
                  count={list.length}
                  locked={locked}
                  crossEdEnabled={crossEdEnabled}
                  listY={listY}
                  frames={frames}
                  edId={ed.id_edition_division}
                  onSameEdReorder={(from, to) =>
                    reorderAt(ed.id_edition_division, from, to)
                  }
                  onCrossDrop={onDrop}
                >
                  <View
                    testID={`participation-row-${p.id_participation}`}
                    className="flex-row flex-wrap items-center py-2 border-b border-gray-100"
                  >
                    {!locked && (
                      <View
                        className="mr-2 p-1"
                        testID={`drag-handle-${p.id_participation}`}
                      >
                        <Ionicons name="menu" size={18} color="#9ca3af" />
                      </View>
                    )}
                    <Text className="text-gray-800 flex-1 mr-2 shrink">
                      {playerLabel(p)}
                    </Text>
                    <View className="flex-row flex-wrap items-center justify-end gap-1">
                      <PlayerHistoryText p={p} />
                      {!locked && (
                        <>
                          <Pressable
                            onPress={() =>
                              moveWithin(ed.id_edition_division, index, -1)
                            }
                            className="p-2"
                            testID={`move-up-${p.id_participation}`}
                          >
                            <Ionicons
                              name="arrow-up"
                              size={18}
                              color="#4b5563"
                            />
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              moveWithin(ed.id_edition_division, index, 1)
                            }
                            className="p-2"
                            testID={`move-down-${p.id_participation}`}
                          >
                            <Ionicons
                              name="arrow-down"
                              size={18}
                              color="#4b5563"
                            />
                          </Pressable>
                          <Pressable
                            testID={`delete-participation-${p.id_participation}`}
                            onPress={() => onDelete(p)}
                            className="p-2"
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#dc2626"
                            />
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                </SortableRow>
              ))}
              {list.length === 0 && (
                <Text className="text-sm text-gray-500">No players</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
