/**
 * Full-page lottery live kiosk (manager auth).
 */

import LotteryLiveKiosk from '@/components/lottery/LotteryLiveKiosk';
import { parseLotteryId } from '@/utils/editionWorkspace';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function LotteryLivePage() {
  const params = useLocalSearchParams<{ editionId: string; lottery?: string }>();
  const editionId = Number(params.editionId);
  const lotteryId = parseLotteryId(params.lottery);

  if (!Number.isFinite(editionId)) {
    return (
      <View className="flex-1 bg-black p-8">
        <Text className="text-white">Invalid edition</Text>
      </View>
    );
  }

  return <LotteryLiveKiosk editionId={editionId} lotteryId={lotteryId} />;
}
