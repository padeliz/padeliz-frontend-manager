/**
 * Shared gate for event lottery subtab routes: wait for lotteries, then
 * none / select empty, or render children with derived lottery id.
 */

import LotteryEmptyState from '@/components/events/lottery/lotteryShared';
import { useEventLotterySelection } from '@/hooks/useEventLotterySelection';
import { desiredLotteryParam } from '@/utils/event/lotteryUrlSync';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

type Props = {
  eventId: number;
  children: (lotteryId: number) => React.ReactNode;
};

export default function LotteryRouteGate({ eventId, children }: Props) {
  const { lotteries, lotteriesLoaded, lotteryId, rawLotteryId, isLoading } =
    useEventLotterySelection(eventId);

  const desired = desiredLotteryParam({
    lotteriesLoaded,
    lotteries,
    lotteryId,
    rawLotteryId,
  });

  if (desired === undefined) {
    return (
      <View className="p-4">
        {isLoading ? (
          <ActivityIndicator testID="lottery-route-loading" />
        ) : null}
      </View>
    );
  }

  if (lotteries.length === 0) {
    return (
      <View className="p-4">
        <LotteryEmptyState kind="none" />
      </View>
    );
  }

  if (desired == null) {
    return (
      <View className="p-4">
        <LotteryEmptyState kind="select" />
      </View>
    );
  }

  return <View className="p-4">{children(desired)}</View>;
}
