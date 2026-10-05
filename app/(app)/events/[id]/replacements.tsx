import EventReplacementsTab from '@/components/events/EventReplacementsTab';
import { parseEventDivisionId } from '@/utils/eventWorkspace';
import { queryKeys } from '@/lib/queryClient';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

const eventDivisionsApi = new EventDivisionsApiService();

export default function ReplacementsRoute() {
  const params = useLocalSearchParams<{ id: string; ed?: string }>();
  const eventId = Number(params.id);
  const divisionsQuery = useQuery({
    queryKey: queryKeys.eventDivisions(eventId),
    queryFn: async () => {
      const res = await eventDivisionsApi.getEventDivisions({
        per_page: 100,
        filters: { event_id: eventId },
      });
      return res.data || [];
    },
  });
  const divisions = divisionsQuery.data || [];
  const edId = parseEventDivisionId(
    params.ed,
    divisions.map(d => d.id_event_division)
  );

  return (
    <View className="p-4">
      <EventReplacementsTab
        eventId={eventId}
        eventDivisionId={edId}
      />
    </View>
  );
}
