/**
 * Full-page lottery live kiosk (manager auth).
 */

import LotteryLiveKiosk from '@/components/lottery/LotteryLiveKiosk';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function LotteryLivePage() {
  const params = useLocalSearchParams<{ editionId: string }>();
  const editionId = Number(params.editionId);

  if (!Number.isFinite(editionId)) {
    return (
      <View className="flex-1 bg-black p-8">
        <Text className="text-white">Invalid edition</Text>
      </View>
    );
  }

  return <LotteryLiveKiosk editionId={editionId} />;
}
