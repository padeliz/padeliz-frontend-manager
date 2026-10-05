/**
 * Event lottery Rules mode: flat orderliness list, generate/recreate, DnD.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import {
  divisionLabel,
  hasPrizeQuantityMismatch,
  prizeLineLabel,
  prizeNameFromLine,
} from '@/components/events/eventLotteryUtils';
import {
  DivisionChip,
  LotteryFinalizedHint,
  MismatchWarning,
} from '@/components/events/lottery/lotteryShared';
import LotteryPrizeThumb from '@/components/events/lottery/LotteryPrizeThumb';
import SortableRow, {
  moveInList,
  reorderList,
  SortableArrows,
  SortableDragHandle,
} from '@/components/events/SortableRow';
import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { queryKeys } from '@/lib/queryClient';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { EventLotteriesApiService } from '@/services/api/eventLotteriesApi';
import { EventLotteryPrizesApiService } from '@/services/api/eventLotteryPrizesApi';
import { EventLotteryRulesApiService } from '@/services/api/eventLotteryRulesApi';
import { ApiEventDivision, ApiEventLotteryPrize } from '@/types/api/entities';
import { ApiEventLotteryRule } from '@/types/api/event';
import { confirmAction } from '@/utils/confirmAction';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const rulesApi = new EventLotteryRulesApiService();
const lotteryPrizesApi = new EventLotteryPrizesApiService();
const lotteriesApi = new EventLotteriesApiService();
const eventDivisionsApi = new EventDivisionsApiService();

const ROW_HEIGHT = 64;

type Props = {
  eventId: number;
  lotteryId: number;
  eventFinalized?: boolean;
  hasLuckies?: boolean;
};

type Draft = {
  event_division_id: number | null;
  lottery_prize_id: number | null;
  rule_prize_quantity: string;
};

const EMPTY_DRAFT: Draft = {
  event_division_id: null,
  lottery_prize_id: null,
  rule_prize_quantity: '1',
};

function sortRules(rules: ApiEventLotteryRule[]): ApiEventLotteryRule[] {
  return [...rules].sort(
    (a, b) =>
      (a.orderliness ?? 0) - (b.orderliness ?? 0) ||
      a.id_lottery_rule - b.id_lottery_rule
  );
}

function sameRuleIdOrder(
  a: ApiEventLotteryRule[],
  b: ApiEventLotteryRule[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every((rule, i) => rule.id_lottery_rule === b[i]?.id_lottery_rule);
}

function ruleMismatchInfo(
  rule: ApiEventLotteryRule,
  prizeLines: ApiEventLotteryPrize[],
  allRules: ApiEventLotteryRule[]
): { mismatched: boolean; prizeQuantity: number; ruleQuantityTotal: number } | null {
  const line =
    prizeLines.find(p => p.id_lottery_prize === rule.lottery_prize_id) ||
    (rule.lottery_prize as ApiEventLotteryPrize | undefined);
  if (!line) return null;
  const totalFromRules = allRules
    .filter(r => r.lottery_prize_id === rule.lottery_prize_id)
    .reduce((sum, r) => sum + Number(r.rule_prize_quantity ?? 0), 0);
  const prizeQty = Number(
    (line as ApiEventLotteryPrize).prize_quantity ??
      (rule.lottery_prize as any)?.prize_quantity ??
      0
  );
  const lineTotal = Number(
    (line as ApiEventLotteryPrize).rule_prize_quantity_total ?? totalFromRules
  );
  const ruleQuantityTotal =
    (line as ApiEventLotteryPrize).prize_quantity != null
      ? totalFromRules
      : lineTotal;
  const mismatched =
    (line as ApiEventLotteryPrize).prize_quantity != null
      ? hasPrizeQuantityMismatch({
          prize_quantity: prizeQty,
          rule_prize_quantity_total: totalFromRules,
        })
      : prizeQty !== lineTotal;
  return {
    mismatched,
    prizeQuantity: prizeQty,
    ruleQuantityTotal,
  };
}

function DeleteRuleButton({
  rule,
  disabled,
  onDeleted,
}: {
  rule: ApiEventLotteryRule;
  disabled: boolean;
  onDeleted: () => Promise<void>;
}) {
  const { status, errorMessage, run } = useActionButtonStatus({
    auditoryFeedback: true,
  });
  return (
    <ActionButton
      testID={`lottery-delete-rule-${rule.id_lottery_rule}`}
      iconOnly
      startIcon="trash-outline"
      accessibilityLabel={`Delete rule #${rule.id_lottery_rule}`}
      variant="ghost"
      iconColor="#dc2626"
      size="sm"
      disabled={disabled}
      status={status}
      errorMessage={errorMessage ?? undefined}
      className="p-2 bg-transparent border-transparent"
      onPress={() => {
        if (disabled) return;
        confirmAction(
          'Delete rule',
          `Delete rule #${rule.id_lottery_rule}?`,
          () => {
            void run(async () => {
              await rulesApi.deleteRule(rule.id_lottery_rule);
              await onDeleted();
            });
          }
        );
      }}
    />
  );
}

export default function LotteryRulesMode({
  eventId,
  lotteryId,
  eventFinalized = false,
  hasLuckies = false,
}: Props) {
  const queryClient = useQueryClient();
  const createStatus = useActionButtonStatus({ auditoryFeedback: true });
  const saveEditStatus = useActionButtonStatus({ auditoryFeedback: true });
  const generateStatus = useActionButtonStatus({ auditoryFeedback: true });

  const [local, setLocal] = useState<ApiEventLotteryRule[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const rulesQuery = useQuery({
    queryKey: queryKeys.eventLotteryRules(lotteryId),
    queryFn: async () => {
      const res = await rulesApi.getRules({
        per_page: 100,
        filters: { lottery_id: lotteryId },
        sort_by: { orderliness: 'asc' },
      });
      return res.data || [];
    },
  });

  const prizeLinesQuery = useQuery({
    queryKey: queryKeys.eventLotteryPrizes(lotteryId),
    queryFn: async () => {
      const res = await lotteryPrizesApi.getLotteryPrizes({
        per_page: 100,
        filters: { lottery_id: lotteryId },
        sort_by: { display_order: 'asc' },
      });
      return res.data || [];
    },
  });

  const divisionsQuery = useQuery({
    queryKey: queryKeys.eventDivisions(eventId),
    queryFn: async () => {
      const res = await eventDivisionsApi.getEventDivisions({
        per_page: 100,
        filters: { event_id: eventId },
      });
      return res.data || [];
    },
  });

  const lotteriesQuery = useQuery({
    queryKey: queryKeys.eventLotteries(eventId),
    queryFn: async () => {
      const res = await lotteriesApi.getLotteries({
        per_page: 50,
        filters: { event_id: eventId },
      });
      return res.data || [];
    },
  });

  const divisions = divisionsQuery.data || [];
  const prizeLines = prizeLinesQuery.data || [];
  const resolvedHasLuckies =
    hasLuckies ||
    !!lotteriesQuery.data?.find(l => l.id_lottery === lotteryId)?.has_luckies;

  useEffect(() => {
    const next = sortRules(rulesQuery.data || []);
    setLocal(prev =>
      sameRuleIdOrder(prev, next) && prev.every((rule, i) => rule === next[i])
        ? prev
        : next
    );
    setEditingId(null);
  }, [rulesQuery.data]);

  const orderDirty = useMemo(() => {
    const original = sortRules(rulesQuery.data || []).map(r => r.id_lottery_rule);
    return local.some((r, i) => r.id_lottery_rule !== original[i]);
  }, [local, rulesQuery.data]);

  const reorderDisabled = eventFinalized || resolvedHasLuckies;
  const crudLocked = eventFinalized || orderDirty;
  const addDisabled = eventFinalized || orderDirty;

  const generateDisabled =
    eventFinalized ||
    resolvedHasLuckies ||
    divisions.length === 0 ||
    prizeLines.length === 0 ||
    orderDirty;

  const divisionOptions = useMemo(
    () =>
      divisions.map((d: ApiEventDivision) => ({
        label:
          d.division_title ||
          d.division?.name ||
          `ED #${d.id_event_division}`,
        value: d.id_event_division,
      })),
    [divisions]
  );

  const prizeLineOptions = useMemo(
    () =>
      prizeLines.map(line => ({
        label: prizeLineLabel(line),
        value: line.id_lottery_prize,
      })),
    [prizeLines]
  );

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.eventLotteryRules(lotteryId),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.eventLotteryPrizes(lotteryId),
    });
  }, [lotteryId, queryClient]);

  const move = (index: number, dir: -1 | 1) => {
    if (reorderDisabled) return;
    const next = moveInList(local, index, dir);
    if (next) setLocal(next);
  };

  const reorder = (from: number, to: number) => {
    if (reorderDisabled) return;
    const next = reorderList(local, from, to);
    if (next) setLocal(next);
  };

  const saveOrder = useCallback(async () => {
    if (reorderDisabled || !orderDirty) return;
    setSaving(true);
    try {
      await rulesApi.reorderLotteryRules(
        lotteryId,
        local.map(r => r.id_lottery_rule)
      );
      await invalidate();
    } finally {
      setSaving(false);
    }
  }, [invalidate, local, lotteryId, orderDirty, reorderDisabled]);

  const cancelOrder = useCallback(() => {
    const next = sortRules(rulesQuery.data || []);
    setLocal(prev =>
      sameRuleIdOrder(prev, next) && prev.every((rule, i) => rule === next[i])
        ? prev
        : next
    );
    setEditingId(null);
  }, [rulesQuery.data]);

  useRegisterPageActions({
    save: saveOrder,
    cancel: cancelOrder,
    refresh: invalidate,
    canSave: orderDirty && !reorderDisabled,
    isDirty: orderDirty && !reorderDisabled,
    isSaving: saving,
  });

  const create = () => {
    if (addDisabled) return;
    void createStatus.run(async () => {
      if (draft.event_division_id == null) {
        throw new Error('Select an event division.');
      }
      if (draft.lottery_prize_id == null) {
        throw new Error('Select a prize line.');
      }
      const qty = Number(draft.rule_prize_quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        throw new Error('Quantity must be at least 1.');
      }
      await rulesApi.createRule({
        lottery_prize_id: draft.lottery_prize_id,
        event_division_id: draft.event_division_id,
        rule_prize_quantity: qty,
      });
      setDraft(EMPTY_DRAFT);
      await invalidate();
    });
  };

  const startEdit = (rule: ApiEventLotteryRule) => {
    if (crudLocked || Number(rule.luckies_count ?? 0) > 0) return;
    setEditingId(rule.id_lottery_rule);
    setEditDraft({
      event_division_id: rule.event_division_id ?? null,
      lottery_prize_id: rule.lottery_prize_id,
      rule_prize_quantity: String(rule.rule_prize_quantity),
    });
  };

  const saveEdit = () => {
    if (editingId == null || crudLocked) return;
    void saveEditStatus.run(async () => {
      if (editDraft.event_division_id == null) {
        throw new Error('Select an event division.');
      }
      if (editDraft.lottery_prize_id == null) {
        throw new Error('Select a prize line.');
      }
      const qty = Number(editDraft.rule_prize_quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        throw new Error('Quantity must be at least 1.');
      }
      await rulesApi.patchRule(editingId, {
        event_division_id: editDraft.event_division_id,
        lottery_prize_id: editDraft.lottery_prize_id,
        rule_prize_quantity: qty,
      });
      setEditingId(null);
      await invalidate();
    });
  };

  const onGenerate = () => {
    if (generateDisabled) return;
    const hasRules = local.length > 0;
    const title = hasRules ? 'Recreate rules?' : 'Generate rules?';
    const message = hasRules
      ? 'This deletes all existing rules for this lottery and rebuilds them.'
      : 'Generate balanced rules from prize lines and divisions?';
    confirmAction(title, message, () => {
      void generateStatus.run(async () => {
        await lotteriesApi.generateRules(lotteryId);
        await invalidate();
      });
    });
  };

  if (rulesQuery.isLoading && local.length === 0) {
    return <ActivityIndicator testID="lottery-rules-loading" />;
  }

  if (rulesQuery.error) {
    return (
      <Text className="text-sm text-red-600">
        {(rulesQuery.error as Error).message || 'Failed to load rules'}
      </Text>
    );
  }

  const generateLabel = local.length === 0 ? 'Generate rules' : 'Recreate rules';

  return (
    <View testID="lottery-rules-mode" className="gap-3">
      {eventFinalized ? <LotteryFinalizedHint mode="rules" /> : null}

      <View className="flex-row flex-wrap items-center gap-2">
        <ActionButton
          testID="lottery-rules-generate"
          label={generateLabel}
          variant="secondary"
          size="sm"
          disabled={generateDisabled}
          status={generateStatus.status}
          errorMessage={generateStatus.errorMessage ?? undefined}
          onPress={onGenerate}
        />
      </View>

      {!eventFinalized ? (
        <View
          testID="lottery-rules-add-form"
          className="border border-gray-200 rounded-lg p-3 bg-white gap-2"
        >
          <Text className="font-semibold text-gray-900">Add rule</Text>
          <View className="flex-row flex-wrap items-end gap-2">
            <View className="flex-1" style={{ minWidth: 160 }}>
              <Text className="text-xs text-gray-500 mb-1">Division</Text>
              <SingleSelectDropdown
                options={divisionOptions}
                selectedValue={draft.event_division_id}
                onSelectionChange={v =>
                  setDraft(prev => ({
                    ...prev,
                    event_division_id: Number(v),
                  }))
                }
                placeholder="Select division"
                title="Division"
                minWidth={160}
                disabled={addDisabled}
              />
            </View>
            <View className="flex-1" style={{ minWidth: 180 }}>
              <Text className="text-xs text-gray-500 mb-1">Prize line</Text>
              <SingleSelectDropdown
                options={prizeLineOptions}
                selectedValue={draft.lottery_prize_id}
                onSelectionChange={v =>
                  setDraft(prev => ({
                    ...prev,
                    lottery_prize_id: Number(v),
                  }))
                }
                placeholder="Select prize line"
                title="Prize line"
                minWidth={180}
                disabled={addDisabled}
              />
            </View>
            <View style={{ minWidth: 90 }}>
              <Text className="text-xs text-gray-500 mb-1">Qty</Text>
              <AppTextInput
                testID="lottery-rule-add-qty"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.rule_prize_quantity}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, rule_prize_quantity: v }))
                }
                keyboardType="numeric"
                editable={!addDisabled}
              />
            </View>
            <ActionButton
              testID="lottery-rule-add-button"
              label="Add"
              variant="primary"
              size="sm"
              disabled={addDisabled}
              status={createStatus.status}
              errorMessage={createStatus.errorMessage ?? undefined}
              onPress={create}
            />
          </View>
        </View>
      ) : null}

      <View
        testID="lottery-rules-list"
        className="border border-gray-200 rounded-lg bg-white"
      >
        {local.length === 0 ? (
          <Text className="text-sm text-gray-500 p-3">
            No lottery rules for this lottery.
          </Text>
        ) : (
          local.map((rule, index) => {
            const editing = editingId === rule.id_lottery_rule;
            const mismatchInfo = ruleMismatchInfo(rule, prizeLines, local);
            const mismatch = !!mismatchInfo?.mismatched;
            const rowLockedByLuckies = Number(rule.luckies_count ?? 0) > 0;
            const editDisabled = crudLocked || rowLockedByLuckies;
            const deleteDisabled = crudLocked || rowLockedByLuckies;
            const ed = divisions.find(
              d => d.id_event_division === rule.event_division_id
            );
            const chipLabel = divisionLabel(rule.event_division_id, divisions);
            return (
              <SortableRow
                key={rule.id_lottery_rule}
                index={index}
                count={local.length}
                locked={reorderDisabled || editing}
                rowHeight={ROW_HEIGHT}
                onReorder={reorder}
                testID={`lottery-rule-sortable-${rule.id_lottery_rule}`}
              >
                <View
                  testID={`lottery-rule-row-${rule.id_lottery_rule}`}
                  className="flex-row flex-wrap items-center px-3 py-2 border-b border-gray-100"
                >
                  {mismatch && mismatchInfo ? (
                    <MismatchWarning
                      testID={`lottery-rule-mismatch-${rule.id_lottery_rule}`}
                      prizeQuantity={mismatchInfo.prizeQuantity}
                      ruleQuantityTotal={mismatchInfo.ruleQuantityTotal}
                    />
                  ) : null}
                  {!reorderDisabled ? (
                    <>
                      <SortableDragHandle
                        testID={`lottery-rule-drag-${rule.id_lottery_rule}`}
                      />
                      <SortableArrows
                        onUp={() => move(index, -1)}
                        onDown={() => move(index, 1)}
                        upTestID={`lottery-rule-up-${rule.id_lottery_rule}`}
                        downTestID={`lottery-rule-down-${rule.id_lottery_rule}`}
                      />
                    </>
                  ) : null}
                  {editing ? (
                    <View className="flex-1 flex-row flex-wrap items-end gap-2 min-w-0">
                      <View style={{ minWidth: 140, flex: 1 }}>
                        <SingleSelectDropdown
                          options={divisionOptions}
                          selectedValue={editDraft.event_division_id}
                          onSelectionChange={v =>
                            setEditDraft(prev => ({
                              ...prev,
                              event_division_id: Number(v),
                            }))
                          }
                          placeholder="Division"
                          title="Division"
                          minWidth={140}
                        />
                      </View>
                      <View style={{ minWidth: 160, flex: 1 }}>
                        <SingleSelectDropdown
                          options={prizeLineOptions}
                          selectedValue={editDraft.lottery_prize_id}
                          onSelectionChange={v =>
                            setEditDraft(prev => ({
                              ...prev,
                              lottery_prize_id: Number(v),
                            }))
                          }
                          placeholder="Prize line"
                          title="Prize line"
                          minWidth={160}
                        />
                      </View>
                      <AppTextInput
                        testID={`lottery-rule-edit-qty-${rule.id_lottery_rule}`}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                        style={{ width: 64 }}
                        value={editDraft.rule_prize_quantity}
                        onChangeText={v =>
                          setEditDraft(prev => ({
                            ...prev,
                            rule_prize_quantity: v,
                          }))
                        }
                        keyboardType="numeric"
                      />
                      <ActionButton
                        testID={`lottery-rule-save-${rule.id_lottery_rule}`}
                        iconOnly
                        startIcon="checkmark"
                        accessibilityLabel="Save rule"
                        variant="ghost"
                        iconColor="#15803d"
                        size="sm"
                        status={saveEditStatus.status}
                        errorMessage={saveEditStatus.errorMessage ?? undefined}
                        className="p-2 bg-transparent border-transparent"
                        onPress={saveEdit}
                      />
                      <ActionButton
                        testID={`lottery-rule-cancel-${rule.id_lottery_rule}`}
                        iconOnly
                        startIcon="close"
                        accessibilityLabel="Cancel edit"
                        variant="ghost"
                        iconColor="#4b5563"
                        size="sm"
                        className="p-2 bg-transparent border-transparent"
                        onPress={() => setEditingId(null)}
                      />
                    </View>
                  ) : (
                    <>
                      <DivisionChip
                        testID={`lottery-rule-division-${rule.id_lottery_rule}`}
                        label={chipLabel}
                        color={(ed as any)?.color ?? ed?.division?.color}
                      />
                      <LotteryPrizeThumb
                        prize={rule.lottery_prize?.prize}
                        size="sm"
                        testID="lottery-rule-prize-thumb"
                      />
                      <View
                        testID={`lottery-rule-name-${rule.id_lottery_rule}`}
                        className="flex-1 min-w-0"
                      >
                        <Text
                          className="text-sm text-gray-900"
                          numberOfLines={1}
                        >
                          {rule.lottery_prize
                            ? prizeNameFromLine(rule.lottery_prize as any)
                            : `Prize line #${rule.lottery_prize_id}`}
                        </Text>
                      </View>
                      <Text
                        testID={`lottery-rule-qty-${rule.id_lottery_rule}`}
                        className="text-xs text-gray-500 mr-3"
                        style={{ minWidth: 48 }}
                      >
                        qty {rule.rule_prize_quantity}
                      </Text>
                      <Text
                        testID={`lottery-rule-sponsor-${rule.id_lottery_rule}`}
                        className="text-xs text-gray-500 mr-2"
                        style={{ minWidth: 72 }}
                        numberOfLines={1}
                      >
                        {(rule.lottery_prize as any)?.sponsor?.name?.trim()
                          ? (rule.lottery_prize as any).sponsor.name
                          : '—'}
                      </Text>
                      <ActionButton
                        testID={`lottery-edit-rule-${rule.id_lottery_rule}`}
                        iconOnly
                        startIcon="pencil"
                        accessibilityLabel={`Edit rule #${rule.id_lottery_rule}`}
                        variant="ghost"
                        iconColor="#4b5563"
                        size="sm"
                        disabled={editDisabled}
                        className="p-2 bg-transparent border-transparent"
                        onPress={() => startEdit(rule)}
                      />
                      <DeleteRuleButton
                        rule={rule}
                        disabled={deleteDisabled}
                        onDeleted={invalidate}
                      />
                    </>
                  )}
                </View>
              </SortableRow>
            );
          })
        )}
      </View>
    </View>
  );
}
