/**
 * Edition lottery Luckies mode: accept/reject board without ED scoping.
 */

import CachedPdfImageReload from '@/components/editions/CachedPdfImageReload';
import {
  divisionLabelFromPayload,
  formatAnnounceCountdown,
  formatLastRefreshRelative,
  formatLotteryTimestamp,
  luckyLifecycleRows,
  phoneNumbersFromLucky,
  primaryLuckyLifecycle,
  prizeLuckiesHeader,
} from '@/components/editions/editionLotteryUtils';
import { LotteryFinalizedHint } from '@/components/editions/lottery/lotteryShared';
import ActionButton from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { useCachedPdfAvatarReload } from '@/hooks/useCachedPdfAvatarReload';
import { queryKeys } from '@/lib/queryClient';
import { EditionLotteryPrizesApiService } from '@/services/api/editionLotteryPrizesApi';
import { lotteryLiveApi } from '@/services/api/lotteryLiveApi';
import { confirmAction } from '@/utils/confirmAction';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

const lotteryPrizesApi = new EditionLotteryPrizesApiService();

type Props = {
  lotteryId: number;
  editionFinalized?: boolean;
};

type LuckyDecision = 'accept' | 'reject';

function playerLabelFromParticipation(p: any): string {
  const player = p?.player ?? p?.drawnParticipation?.player;
  if (!player) {
    return `Participation #${p?.id_participation ?? p?.drawn_participation_id ?? '?'}`;
  }
  return (
    player.name ||
    [player.first_name, player.last_name].filter(Boolean).join(' ') ||
    `Player #${player.id_player ?? player.player_id}`
  );
}

function isLuckyPending(lucky: any): boolean {
  return (
    (lucky.accepted_at == null || lucky.accepted_at === '') &&
    (lucky.rejected_at == null || lucky.rejected_at === '')
  );
}

function luckyLotteryId(
  lucky: any,
  selectedLotteryId?: number | null
): number | null {
  if (selectedLotteryId != null) return selectedLotteryId;
  const fromPrize =
    lucky?.lotteryRule?.lottery_prize?.lottery_id ??
    lucky?.lottery_rule?.lottery_prize?.lottery_id ??
    lucky?.lotteryRule?.lottery_id ??
    lucky?.lottery_rule?.lottery_id;
  if (fromPrize != null) return Number(fromPrize);
  return null;
}

function luckyEditionDivisionId(lucky: any): number | null | undefined {
  return (
    lucky?.lotteryRule?.edition_division_id ??
    lucky?.lottery_rule?.edition_division_id
  );
}

function luckyEditionDivision(lucky: any) {
  return (
    lucky?.lotteryRule?.edition_division ??
    lucky?.lottery_rule?.edition_division ??
    null
  );
}

function LuckyDecideButton({
  action,
  lucky,
  lotteryId,
  disabled,
  onDecide,
}: {
  action: LuckyDecision;
  lucky: any;
  lotteryId: number;
  disabled: boolean;
  onDecide: (
    action: LuckyDecision,
    lotteryId: number,
    idLucky: number
  ) => Promise<void>;
}) {
  const { status, errorMessage, run } = useActionButtonStatus({
    auditoryFeedback: true,
  });
  const isAccept = action === 'accept';

  return (
    <ActionButton
      testID={`lottery-${action}-lucky-${lucky.id_lucky}`}
      label={isAccept ? 'Accept' : 'Reject'}
      variant={isAccept ? 'positive' : 'danger'}
      size="sm"
      disabled={disabled}
      status={status}
      errorMessage={errorMessage ?? undefined}
      onPress={() => {
        confirmAction(
          isAccept ? 'Accept prize' : 'Reject prize',
          isAccept ? 'Accept this lucky prize?' : 'Reject this lucky prize?',
          () => {
            void run(async () => {
              const lotteryIdForLucky = luckyLotteryId(lucky, lotteryId);
              if (!lotteryIdForLucky) {
                throw new Error('Could not resolve lottery for this lucky.');
              }
              await onDecide(action, lotteryIdForLucky, Number(lucky.id_lucky));
            });
          }
        );
      }}
    />
  );
}

export default function LotteryLuckiesMode({
  lotteryId,
  editionFinalized = false,
}: Props) {
  const queryClient = useQueryClient();
  const [infoOpenId, setInfoOpenId] = useState<number | null>(null);
  const {
    spinning: avatarSpinning,
    errors: avatarErrors,
    urlFor: avatarUrlFor,
    reload: reloadAvatarState,
  } = useCachedPdfAvatarReload();
  const [nowTick, setNowTick] = useState(() => Date.now());

  const prizesQuery = useQuery({
    queryKey: queryKeys.editionLotteryPrizesWithLuckies(lotteryId),
    queryFn: async () => {
      const res = await lotteryPrizesApi.getLotteryPrizes({
        per_page: 100,
        include: 'luckies',
        filters: { lottery_id: lotteryId },
        sort_by: { display_order: 'asc' },
      });
      return res;
    },
  });

  const prizeLines = prizesQuery.data?.data || [];
  const hasUnresolved = Boolean(prizesQuery.data?.meta?.has_unresolved_pending);
  const shouldPoll = !editionFinalized && hasUnresolved;

  useEffect(() => {
    if (!shouldPoll) return;
    const id = setInterval(() => {
      void prizesQuery.refetch();
    }, 30_000);
    return () => clearInterval(id);
  }, [shouldPoll, prizesQuery.refetch]);

  useEffect(() => {
    if (!shouldPoll) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shouldPoll]);

  const invalidateLuckiesBoard = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.editionLotteryPrizesWithLuckies(lotteryId),
    });
  };

  const decideMutation = useMutation({
    mutationFn: async ({
      action,
      lotteryId: lid,
      idLucky,
    }: {
      action: LuckyDecision;
      lotteryId: number;
      idLucky: number;
    }) => {
      if (action === 'accept') {
        return lotteryLiveApi.accept(lid, idLucky);
      }
      return lotteryLiveApi.reject(lid, idLucky);
    },
    onSuccess: () => {
      invalidateLuckiesBoard();
    },
  });

  const onDecide = async (
    action: LuckyDecision,
    lotteryIdForLucky: number,
    idLucky: number
  ) => {
    await decideMutation.mutateAsync({
      action,
      lotteryId: lotteryIdForLucky,
      idLucky,
    });
  };

  const onReloadAvatar = async (lucky: any) => {
    const idLucky = Number(lucky.id_lucky);
    const participation =
      lucky.drawn_participation || lucky.drawnParticipation;
    const playerId = Number(
      participation?.player_id ??
        participation?.player?.id_player ??
        participation?.player?.player_id
    );
    const collecting = Boolean(participation?.is_collecting_points ?? false);
    await reloadAvatarState({
      key: idLucky,
      playerId,
      collecting,
    });
  };

  const luckyGroups = prizeLines.map(line => ({
    prizeId: line.id_lottery_prize,
    items: Array.isArray(line.luckies) ? line.luckies : [],
    header: prizeLuckiesHeader(line),
  }));

  if (prizesQuery.isLoading) {
    return <ActivityIndicator testID="lottery-luckies-loading" />;
  }

  const lastRefreshLabel =
    shouldPoll && prizesQuery.dataUpdatedAt
      ? formatLastRefreshRelative(prizesQuery.dataUpdatedAt, nowTick)
      : null;

  return (
    <View className="gap-3" testID="lottery-luckies-board">
      {editionFinalized ? <LotteryFinalizedHint mode="luckies" /> : null}
      {lastRefreshLabel ? (
        <Text
          testID="lottery-luckies-last-refresh"
          className="text-xs text-gray-500"
        >
          {lastRefreshLabel}
        </Text>
      ) : null}
      {prizeLines.length === 0 ? (
        <Text className="text-sm text-gray-500">
          No lottery prizes for this edition.
        </Text>
      ) : (
        luckyGroups.map(group => (
          <View
            key={`lucky-group-${group.prizeId}`}
            testID={`lucky-group-${group.prizeId}`}
            className="gap-2"
          >
            <Text
              testID={`lucky-group-header-${group.prizeId}`}
              className="text-sm font-semibold text-gray-900"
            >
              {group.header}
            </Text>
            <View
              testID={`lucky-group-cards-${group.prizeId}`}
              className="flex-row flex-wrap gap-2"
            >
              {group.items.map((lucky: any) => {
                const pending = isLuckyPending(lucky);
                const edId = luckyEditionDivisionId(lucky);
                const divisionPart = divisionLabelFromPayload(
                  edId,
                  luckyEditionDivision(lucky)
                );
                const name =
                  lucky.short_name ||
                  playerLabelFromParticipation(
                    lucky.drawn_participation || lucky
                  );
                const primary = primaryLuckyLifecycle(lucky);
                const rows = luckyLifecycleRows(lucky);
                const idLucky = Number(lucky.id_lucky);
                const avatarUrl = avatarUrlFor(
                  idLucky,
                  (lucky.pdf_avatar_url as string | null) ?? null
                );
                const infoOpen = infoOpenId === lucky.id_lucky;
                const rejected = lucky.rejected_at != null;
                const phones = pending ? phoneNumbersFromLucky(lucky) : [];
                return (
                  <View
                    key={lucky.id_lucky}
                    testID={`lottery-lucky-card-${lucky.id_lucky}`}
                    className="bg-white border border-gray-200 rounded-lg p-3"
                    style={{
                      width: 280,
                      maxWidth: '100%',
                      opacity: rejected ? 0.5 : 1,
                    }}
                  >
                    <View className="flex-row items-center gap-2">
                      <CachedPdfImageReload
                        testIdPrefix={`lucky-avatar-${idLucky}`}
                        imageUrl={avatarUrl}
                        spinning={Boolean(avatarSpinning[idLucky])}
                        errorReason={avatarErrors[idLucky] || null}
                        onReload={() => onReloadAvatar(lucky)}
                      />
                      <View className="flex-1 min-w-0">
                        <Text
                          testID={`lucky-header-${lucky.id_lucky}`}
                          className="text-sm font-medium text-gray-900"
                        >
                          Lucky #{lucky.id_lucky} · {divisionPart}
                        </Text>
                        <Text
                          testID={`lucky-name-${lucky.id_lucky}`}
                          className="text-sm text-gray-700"
                        >
                          {name}
                        </Text>
                      </View>
                      <Pressable
                        testID={`lucky-info-${lucky.id_lucky}`}
                        onPress={() =>
                          setInfoOpenId(infoOpen ? null : lucky.id_lucky)
                        }
                        className="px-2 py-1 rounded border border-gray-300"
                      >
                        <Text className="text-xs text-gray-600">Info</Text>
                      </Pressable>
                    </View>
                    {pending ? (
                      <View
                        testID={`lucky-phones-${lucky.id_lucky}`}
                        className="mt-2"
                      >
                        {phones.length > 0 ? (
                          phones.map((phone, idx) => (
                            <View
                              key={`${lucky.id_lucky}-phone-${idx}`}
                              className="flex-row items-center gap-1"
                            >
                              <View
                                testID={`lucky-phone-icon-${lucky.id_lucky}-${idx}`}
                              >
                                <Ionicons
                                  name="call-outline"
                                  size={14}
                                  color="#4b5563"
                                />
                              </View>
                              <Text
                                testID={`lucky-phone-${lucky.id_lucky}-${idx}`}
                                className="text-xs text-gray-600"
                              >
                                {phone}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text
                            testID={`lucky-phone-empty-${lucky.id_lucky}`}
                            className="text-xs text-gray-500"
                          >
                            No phone
                          </Text>
                        )}
                      </View>
                    ) : null}
                    {(() => {
                      const notAnnounced =
                        lucky.announced_at == null || lucky.announced_at === '';
                      const announceCd =
                        pending && notAnnounced
                          ? formatAnnounceCountdown(lucky.available_at, nowTick)
                          : null;
                      if (announceCd != null) {
                        return (
                          <Text
                            testID={`lucky-primary-ts-${lucky.id_lucky}`}
                            className="text-xs text-gray-500 mt-2"
                          >
                            Announcing in{' '}
                            <Text className="font-semibold">{announceCd}</Text>
                          </Text>
                        );
                      }
                      if (primary) {
                        return (
                          <Text
                            testID={`lucky-primary-ts-${lucky.id_lucky}`}
                            className="text-xs text-gray-500 mt-2"
                          >
                            {primary.label}{' '}
                            {formatLotteryTimestamp(primary.value)}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                    {infoOpen ? (
                      <View
                        testID={`lucky-info-popover-${lucky.id_lucky}`}
                        className="mt-2 gap-1 border border-gray-100 rounded-lg p-2 bg-gray-50"
                      >
                        {rows.map(row => (
                          <Text
                            key={row.key}
                            testID={`lucky-ts-${lucky.id_lucky}-${row.key}`}
                            className="text-xs text-gray-600"
                          >
                            {row.label}: {row.display}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {pending ? (
                      <View className="flex-row flex-wrap gap-2 mt-2">
                        <LuckyDecideButton
                          action="accept"
                          lucky={lucky}
                          lotteryId={lotteryId}
                          disabled={editionFinalized}
                          onDecide={onDecide}
                        />
                        <LuckyDecideButton
                          action="reject"
                          lucky={lucky}
                          lotteryId={lotteryId}
                          disabled={editionFinalized}
                          onDecide={onDecide}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}
