/**
 * Edition lottery Prizes mode: inline CUD + DnD display_order.
 * No prizes board, deep-links, divisions, or rules list fetch.
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import {
  hasPrizeQuantityMismatch,
  prizeLineLabel,
  prizeNameFromLine,
} from '@/components/editions/editionLotteryUtils';
import {
  LotteryFinalizedHint,
  MismatchWarning,
} from '@/components/editions/lottery/lotteryShared';
import LotteryPrizeThumb from '@/components/editions/lottery/LotteryPrizeThumb';
import SortableRow, {
  moveInList,
  reorderList,
  SortableArrows,
  SortableDragHandle,
} from '@/components/editions/SortableRow';
import ActionButton from '@/components/ui/ActionButton';
import AppTextInput from '@/components/ui/AppTextInput';
import SingleSelectDropdown from '@/components/ui/SingleSelectDropdown';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { queryKeys } from '@/lib/queryClient';
import { EditionLotteriesApiService } from '@/services/api/editionLotteriesApi';
import { EditionLotteryPrizesApiService } from '@/services/api/editionLotteryPrizesApi';
import { PrizesApiService } from '@/services/api/prizesApi';
import { SponsorsApiService } from '@/services/api/sponsorsApi';
import { ApiEditionLotteryPrize } from '@/types/api/entities';
import { confirmAction } from '@/utils/confirmAction';
import { resolvePrizeMedia } from '@/utils/edition/lotteryMedia';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const lotteryPrizesApi = new EditionLotteryPrizesApiService();
const lotteriesApi = new EditionLotteriesApiService();
const prizesApi = new PrizesApiService();
const sponsorsApi = new SponsorsApiService();

const ROW_HEIGHT = 64;

type Props = {
  editionId: number;
  lotteryId: number;
  editionFinalized?: boolean;
  hasLuckies?: boolean;
};

type Draft = {
  prize_id: number | null;
  prize_quantity: string;
  sponsor_id: number | null;
};

const EMPTY_DRAFT: Draft = {
  prize_id: null,
  prize_quantity: '1',
  sponsor_id: null,
};

function sortPrizeLines(lines: ApiEditionLotteryPrize[]): ApiEditionLotteryPrize[] {
  return [...lines].sort(
    (a, b) =>
      (a.display_order ?? 0) - (b.display_order ?? 0) ||
      a.id_lottery_prize - b.id_lottery_prize
  );
}

function samePrizeIdOrder(
  a: ApiEditionLotteryPrize[],
  b: ApiEditionLotteryPrize[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every((line, i) => line.id_lottery_prize === b[i]?.id_lottery_prize);
}

function DeletePrizeButton({
  line,
  disabled,
  onDeleted,
}: {
  line: ApiEditionLotteryPrize;
  disabled: boolean;
  onDeleted: () => Promise<void>;
}) {
  const { status, errorMessage, run } = useActionButtonStatus({
    auditoryFeedback: true,
  });
  return (
    <ActionButton
      testID={`lottery-delete-prize-${line.id_lottery_prize}`}
      iconOnly
      startIcon="trash-outline"
      accessibilityLabel={`Delete ${prizeLineLabel(line)}`}
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
          'Delete prize line',
          `Delete ${prizeLineLabel(line)}?`,
          () => {
            void run(async () => {
              await lotteryPrizesApi.deleteLotteryPrize(line.id_lottery_prize);
              await onDeleted();
            });
          }
        );
      }}
    />
  );
}

export default function LotteryPrizesMode({
  editionId,
  lotteryId,
  editionFinalized = false,
  hasLuckies = false,
}: Props) {
  const queryClient = useQueryClient();
  const createStatus = useActionButtonStatus({ auditoryFeedback: true });
  const saveEditStatus = useActionButtonStatus({ auditoryFeedback: true });

  const [local, setLocal] = useState<ApiEditionLotteryPrize[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [prizeSearch, setPrizeSearch] = useState('');
  const [sponsorSearch, setSponsorSearch] = useState('');

  const linesQuery = useQuery({
    queryKey: queryKeys.editionLotteryPrizes(lotteryId),
    queryFn: async () => {
      const res = await lotteryPrizesApi.getLotteryPrizes({
        per_page: 100,
        filters: { lottery_id: lotteryId },
        sort_by: { display_order: 'asc' },
      });
      return res.data || [];
    },
  });

  const catalogPrizesQuery = useQuery({
    queryKey: ['prizesPicker', prizeSearch],
    queryFn: async () => {
      const res = await prizesApi.getPrizes({
        per_page: 50,
        q: prizeSearch || undefined,
      });
      return res.data || [];
    },
  });

  const sponsorsQuery = useQuery({
    queryKey: ['sponsorsPicker', sponsorSearch],
    queryFn: async () => {
      const res = await sponsorsApi.getSponsors({
        per_page: 50,
        q: sponsorSearch || undefined,
      });
      return res.data || [];
    },
  });

  const lotteriesQuery = useQuery({
    queryKey: queryKeys.editionLotteries(editionId),
    queryFn: async () => {
      const res = await lotteriesApi.getLotteries({
        per_page: 50,
        filters: { edition_id: editionId },
      });
      return res.data || [];
    },
  });

  const resolvedHasLuckies =
    hasLuckies ||
    !!lotteriesQuery.data?.find(l => l.id_lottery === lotteryId)?.has_luckies;

  useEffect(() => {
    const next = sortPrizeLines(linesQuery.data || []);
    setLocal(prev =>
      samePrizeIdOrder(prev, next) && prev.every((line, i) => line === next[i])
        ? prev
        : next
    );
    setEditingId(null);
  }, [linesQuery.data]);

  const orderDirty = useMemo(() => {
    const original = sortPrizeLines(linesQuery.data || []).map(
      l => l.id_lottery_prize
    );
    return local.some((l, i) => l.id_lottery_prize !== original[i]);
  }, [linesQuery.data, local]);

  const reorderDisabled = editionFinalized || resolvedHasLuckies;
  const crudLocked = editionFinalized || orderDirty;
  const addDisabled = editionFinalized || orderDirty;

  const prizeOptions = useMemo(
    () =>
      (catalogPrizesQuery.data || []).map(p => {
        const media = resolvePrizeMedia(p);
        return {
          label: p.name,
          value: p.id_prize,
          imageUrl: media.isVideo ? null : media.url,
        };
      }),
    [catalogPrizesQuery.data]
  );

  const sponsorOptions = useMemo(
    () =>
      (sponsorsQuery.data || []).map(s => ({
        label: s.name,
        value: s.id_sponsor,
      })),
    [sponsorsQuery.data]
  );

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.editionLotteryPrizes(lotteryId),
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
      await lotteryPrizesApi.reorderLotteryPrizes(
        lotteryId,
        local.map(l => l.id_lottery_prize)
      );
      await invalidate();
    } finally {
      setSaving(false);
    }
  }, [invalidate, local, lotteryId, orderDirty, reorderDisabled]);

  const cancelOrder = useCallback(() => {
    const next = sortPrizeLines(linesQuery.data || []);
    setLocal(prev =>
      samePrizeIdOrder(prev, next) && prev.every((line, i) => line === next[i])
        ? prev
        : next
    );
    setEditingId(null);
  }, [linesQuery.data]);

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
      if (draft.prize_id == null) {
        throw new Error('Select a catalog prize.');
      }
      const qty = Number(draft.prize_quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        throw new Error('Quantity must be at least 1.');
      }
      await lotteryPrizesApi.createLotteryPrize({
        lottery_id: lotteryId,
        prize_id: draft.prize_id,
        prize_quantity: qty,
        sponsor_id: draft.sponsor_id,
      });
      setDraft(EMPTY_DRAFT);
      await invalidate();
    });
  };

  const startEdit = (line: ApiEditionLotteryPrize) => {
    if (crudLocked || resolvedHasLuckies) return;
    setEditingId(line.id_lottery_prize);
    setEditDraft({
      prize_id: line.prize_id,
      prize_quantity: String(line.prize_quantity),
      sponsor_id: line.sponsor_id ?? null,
    });
  };

  const saveEdit = () => {
    if (editingId == null || crudLocked || resolvedHasLuckies) return;
    void saveEditStatus.run(async () => {
      if (editDraft.prize_id == null) {
        throw new Error('Select a catalog prize.');
      }
      const qty = Number(editDraft.prize_quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        throw new Error('Quantity must be at least 1.');
      }
      await lotteryPrizesApi.patchLotteryPrize(editingId, {
        prize_id: editDraft.prize_id,
        prize_quantity: qty,
        sponsor_id: editDraft.sponsor_id,
      });
      setEditingId(null);
      await invalidate();
    });
  };

  if (linesQuery.isLoading && local.length === 0) {
    return <ActivityIndicator testID="lottery-prizes-loading" />;
  }

  if (linesQuery.error) {
    return (
      <Text className="text-sm text-red-600">
        {(linesQuery.error as Error).message || 'Failed to load prize lines'}
      </Text>
    );
  }

  return (
    <View testID="lottery-prizes-mode" className="gap-3">
      {editionFinalized ? <LotteryFinalizedHint mode="prizes" /> : null}

      {!editionFinalized ? (
        <View
          testID="lottery-prizes-add-form"
          className="border border-gray-200 rounded-lg p-3 bg-white gap-2"
        >
          <Text className="font-semibold text-gray-900">Add prize line</Text>
          <View className="flex-row flex-wrap items-end gap-2">
            <View className="flex-1" style={{ minWidth: 180 }}>
              <Text className="text-xs text-gray-500 mb-1">Prize</Text>
              <SingleSelectDropdown
                options={prizeOptions}
                selectedValue={draft.prize_id}
                onSelectionChange={v =>
                  setDraft(prev => ({ ...prev, prize_id: Number(v) }))
                }
                placeholder="Select prize"
                title="Prize"
                searchable
                onSearch={setPrizeSearch}
                loading={catalogPrizesQuery.isFetching}
                minWidth={180}
                disabled={addDisabled}
              />
            </View>
            <View style={{ minWidth: 90 }}>
              <Text className="text-xs text-gray-500 mb-1">Qty</Text>
              <AppTextInput
                testID="lottery-prize-add-qty"
                className="border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                value={draft.prize_quantity}
                onChangeText={v =>
                  setDraft(prev => ({ ...prev, prize_quantity: v }))
                }
                keyboardType="numeric"
                editable={!addDisabled}
              />
            </View>
            <View className="flex-1" style={{ minWidth: 160 }}>
              <Text className="text-xs text-gray-500 mb-1">Sponsor</Text>
              <SingleSelectDropdown
                options={sponsorOptions}
                selectedValue={draft.sponsor_id}
                onSelectionChange={v =>
                  setDraft(prev => ({
                    ...prev,
                    sponsor_id: v == null ? null : Number(v),
                  }))
                }
                placeholder="Optional sponsor"
                title="Sponsor"
                searchable
                clearable
                onSearch={setSponsorSearch}
                loading={sponsorsQuery.isFetching}
                minWidth={160}
                disabled={addDisabled}
              />
            </View>
            <ActionButton
              testID="lottery-prize-add-button"
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
        testID="lottery-prizes-list"
        className="border border-gray-200 rounded-lg bg-white"
      >
        {local.length === 0 ? (
          <Text className="text-sm text-gray-500 p-3">
            No prize lines for this lottery.
          </Text>
        ) : (
          local.map((line, index) => {
            const editing = editingId === line.id_lottery_prize;
            const mismatch = hasPrizeQuantityMismatch(line);
            const deleteDisabled =
              crudLocked ||
              resolvedHasLuckies ||
              Number(line.rules_count ?? 0) > 0;
            const editDisabled = crudLocked || resolvedHasLuckies;
            return (
              <SortableRow
                key={line.id_lottery_prize}
                index={index}
                count={local.length}
                locked={reorderDisabled || editing}
                rowHeight={ROW_HEIGHT}
                onReorder={reorder}
                testID={`lottery-prize-sortable-${line.id_lottery_prize}`}
              >
                <View
                  testID={`lottery-prize-line-${line.id_lottery_prize}`}
                  className="flex-row flex-wrap items-center px-3 py-2 border-b border-gray-100"
                >
                  {mismatch ? (
                    <MismatchWarning
                      testID={`lottery-prize-mismatch-${line.id_lottery_prize}`}
                      prizeQuantity={Number(line.prize_quantity ?? 0)}
                      ruleQuantityTotal={Number(
                        line.rule_prize_quantity_total ?? 0
                      )}
                    />
                  ) : null}
                  {!reorderDisabled ? (
                    <>
                      <SortableDragHandle
                        testID={`lottery-prize-drag-${line.id_lottery_prize}`}
                      />
                      <SortableArrows
                        onUp={() => move(index, -1)}
                        onDown={() => move(index, 1)}
                        upTestID={`lottery-prize-up-${line.id_lottery_prize}`}
                        downTestID={`lottery-prize-down-${line.id_lottery_prize}`}
                      />
                    </>
                  ) : null}
                  <LotteryPrizeThumb prize={line.prize} size="md" />
                  {editing ? (
                    <View className="flex-1 flex-row flex-wrap items-end gap-2 min-w-0">
                      <View style={{ minWidth: 140, flex: 1 }}>
                        <SingleSelectDropdown
                          options={prizeOptions}
                          selectedValue={editDraft.prize_id}
                          onSelectionChange={v =>
                            setEditDraft(prev => ({
                              ...prev,
                              prize_id: Number(v),
                            }))
                          }
                          placeholder="Prize"
                          title="Prize"
                          searchable
                          onSearch={setPrizeSearch}
                          minWidth={140}
                        />
                      </View>
                      <AppTextInput
                        testID={`lottery-prize-edit-qty-${line.id_lottery_prize}`}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-gray-900"
                        style={{ width: 64 }}
                        value={editDraft.prize_quantity}
                        onChangeText={v =>
                          setEditDraft(prev => ({
                            ...prev,
                            prize_quantity: v,
                          }))
                        }
                        keyboardType="numeric"
                      />
                      <View style={{ minWidth: 120, flex: 1 }}>
                        <SingleSelectDropdown
                          options={sponsorOptions}
                          selectedValue={editDraft.sponsor_id}
                          onSelectionChange={v =>
                            setEditDraft(prev => ({
                              ...prev,
                              sponsor_id: v == null ? null : Number(v),
                            }))
                          }
                          placeholder="Sponsor"
                          title="Sponsor"
                          searchable
                          clearable
                          onSearch={setSponsorSearch}
                          minWidth={120}
                        />
                      </View>
                      <ActionButton
                        testID={`lottery-prize-save-${line.id_lottery_prize}`}
                        iconOnly
                        startIcon="checkmark"
                        accessibilityLabel="Save prize line"
                        variant="ghost"
                        iconColor="#15803d"
                        size="sm"
                        status={saveEditStatus.status}
                        errorMessage={saveEditStatus.errorMessage ?? undefined}
                        className="p-2 bg-transparent border-transparent"
                        onPress={saveEdit}
                      />
                      <ActionButton
                        testID={`lottery-prize-cancel-${line.id_lottery_prize}`}
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
                      <View
                        testID={`lottery-prize-name-${line.id_lottery_prize}`}
                        className="flex-1 min-w-0"
                      >
                        <Text
                          className="text-sm text-gray-900"
                          numberOfLines={1}
                        >
                          {prizeNameFromLine(line)}
                        </Text>
                      </View>
                      <Text
                        testID={`lottery-prize-qty-${line.id_lottery_prize}`}
                        className="text-xs text-gray-500 mr-3"
                        style={{ minWidth: 48 }}
                      >
                        qty {line.prize_quantity}
                      </Text>
                      <Text
                        testID={`lottery-prize-sponsor-${line.id_lottery_prize}`}
                        className="text-xs text-gray-500 mr-2"
                        style={{ minWidth: 72 }}
                        numberOfLines={1}
                      >
                        {line.sponsor?.name?.trim()
                          ? line.sponsor.name
                          : '—'}
                      </Text>
                      <ActionButton
                        testID={`lottery-edit-prize-${line.id_lottery_prize}`}
                        iconOnly
                        startIcon="pencil"
                        accessibilityLabel={`Edit ${prizeLineLabel(line)}`}
                        variant="ghost"
                        iconColor="#4b5563"
                        size="sm"
                        disabled={editDisabled}
                        className="p-2 bg-transparent border-transparent"
                        onPress={() => startEdit(line)}
                      />
                      <DeletePrizeButton
                        line={line}
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
