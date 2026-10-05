import LotteryLuckiesMode from '@/components/events/lottery/LotteryLuckiesMode';
import LotteryRouteGate from '@/components/events/lottery/LotteryRouteGate';
import { queryKeys } from '@/lib/queryClient';
import { EventsApiService } from '@/services/api/eventsApi';
import { useQuery } from '@tanstack/react-query';
import {
  useGlobalSearchParams,
  useLocalSearchParams,
} from 'expo-router';
import React from 'react';

const eventsApi = new EventsApiService();

export default function LotteryLuckiesRoute() {
  const localParams = useLocalSearchParams<{ id: string; lottery?: string }>();
  const globalParams = useGlobalSearchParams<{ id?: string; lottery?: string }>();
  const eventId = Number(localParams.id ?? globalParams.id);

  const eventQuery = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: async () => {
      const res = await eventsApi.getEvent(eventId);
      return res.data;
    },
    enabled: Number.isFinite(eventId),
  });

  return (
    <LotteryRouteGate eventId={eventId}>
      {lotteryId => (
        <LotteryLuckiesMode
          lotteryId={lotteryId}
          eventFinalized={!!eventQuery.data?.finalized_at}
        />
      )}
    </LotteryRouteGate>
  );
}
