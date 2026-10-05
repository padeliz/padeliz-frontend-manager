import EventDivisionsTab from '@/components/events/EventDivisionsTab';
import { queryKeys } from '@/lib/queryClient';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { EventsApiService } from '@/services/api/eventsApi';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const eventsApi = new EventsApiService();
const eventDivisionsApi = new EventDivisionsApiService();
const divisionsApi = new DivisionsApiService();

export default function EventDivisionsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = Number(params.id);

  const eventQuery = useQuery({
    queryKey: queryKeys.event(eventId),
    queryFn: async () => {
      const res = await eventsApi.getEvent(eventId);
      return res.data;
    },
    enabled: Number.isFinite(eventId),
  });

  const divisionsQuery = useQuery({
    queryKey: queryKeys.eventDivisions(eventId),
    queryFn: async () => {
      const res = await eventDivisionsApi.getEventDivisions({
        per_page: 100,
        filters: { event_id: eventId },
        sort_by: { skill_order: 'asc' },
      });
      return res.data || [];
    },
    enabled: Number.isFinite(eventId),
  });

  const catalogQuery = useQuery({
    queryKey: ['divisionsCatalog'],
    queryFn: async () => {
      const res = await divisionsApi.getDivisions({ per_page: 100 });
      return res.data || [];
    },
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="p-4">
        <EventDivisionsTab
          eventId={eventId}
          eventFinalized={!!eventQuery.data?.finalized_at}
          divisions={divisionsQuery.data || []}
          catalogDivisions={catalogQuery.data || []}
          onRefresh={async () => {
            await divisionsQuery.refetch();
            await catalogQuery.refetch();
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}
