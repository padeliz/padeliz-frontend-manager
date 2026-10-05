import EventRegistrationImportPanel from '@/components/events/EventRegistrationImportPanel';
import { queryKeys } from '@/lib/queryClient';
import { EventsApiService } from '@/services/api/eventsApi';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

const eventsApi = new EventsApiService();

export default function EventRegisterPlayersTab() {
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

  const finalized = !!eventQuery.data?.finalized_at;

  return (
    <View className="p-4 flex-1">
      <EventRegistrationImportPanel
        eventId={eventId}
        finalized={finalized}
      />
    </View>
  );
}
