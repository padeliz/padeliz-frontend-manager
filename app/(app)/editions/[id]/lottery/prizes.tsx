import EditionLotteryTab from '@/components/editions/EditionLotteryTab';
import { queryKeys } from '@/lib/queryClient';
import { EditionsApiService } from '@/services/api/editionsApi';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

const editionsApi = new EditionsApiService();

export default function LotteryPrizesRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const editionId = Number(params.id);

  const editionQuery = useQuery({
    queryKey: queryKeys.edition(editionId),
    queryFn: async () => {
      const res = await editionsApi.getEdition(editionId);
      return res.data;
    },
    enabled: Number.isFinite(editionId),
  });

  return (
    <View className="p-4">
      <EditionLotteryTab
        editionId={editionId}
        mode="prizes"
        editionFinalized={!!editionQuery.data?.finalized_at}
      />
    </View>
  );
}
