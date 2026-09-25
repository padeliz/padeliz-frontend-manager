import LotteryPrizesMode from '@/components/editions/lottery/LotteryPrizesMode';
import LotteryRouteGate from '@/components/editions/lottery/LotteryRouteGate';
import { queryKeys } from '@/lib/queryClient';
import { EditionsApiService } from '@/services/api/editionsApi';
import { useQuery } from '@tanstack/react-query';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
} from 'expo-router';
import React from 'react';

const editionsApi = new EditionsApiService();

export default function LotteryPrizesRoute() {
  const localParams = useLocalSearchParams<{ id: string; lottery?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string; lottery?: string }>();
  const editionId = Number(localParams.id ?? globalParams.id);

  const editionQuery = useQuery({
    queryKey: queryKeys.edition(editionId),
    queryFn: async () => {
      const res = await editionsApi.getEdition(editionId);
      return res.data;
    },
    enabled: Number.isFinite(editionId),
  });

  return (
    <LotteryRouteGate editionId={editionId}>
      {lotteryId => (
        <LotteryPrizesMode
          editionId={editionId}
          lotteryId={lotteryId}
          editionFinalized={!!editionQuery.data?.finalized_at}
        />
      )}
    </LotteryRouteGate>
  );
}
