/**
 * Full-page lottery live kiosk (manager auth).
 */

import LotteryLiveKiosk from '@/components/lottery/LotteryLiveKiosk';
import { parseLotteryId } from '@/utils/eventWorkspace';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function LotteryLivePage() {
  const params = useLocalSearchParams<{ eventId: string; lottery?: string }>();
  const eventId = Number(params.eventId);
  const lotteryId = parseLotteryId(params.lottery);

  if (!Number.isFinite(eventId)) {
    return (
      <View className="flex-1 bg-black p-8">
        <Text className="text-white">Invalid event</Text>
      </View>
    );
  }

  return <LotteryLiveKiosk eventId={eventId} lotteryId={lotteryId} />;
}
