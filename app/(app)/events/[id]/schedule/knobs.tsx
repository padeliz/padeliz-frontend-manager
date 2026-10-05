import EventScheduleTab from '@/components/events/EventScheduleTab';
import { parseEventDivisionId } from '@/utils/eventWorkspace';
import { queryKeys } from '@/lib/queryClient';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { EventsApiService } from '@/services/api/eventsApi';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

const eventDivisionsApi = new EventDivisionsApiService();
const eventsApi = new EventsApiService();

function useScheduleRouteContext() {
  const params = useLocalSearchParams<{ id: string; ed?: string }>();
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
      });
      return res.data || [];
    },
  });
  const divisions = divisionsQuery.data || [];
  const edId = parseEventDivisionId(
    params.ed,
    divisions.map(d => d.id_event_division)
  );
  const locationId =
    (eventQuery.data as any)?.location_id ??
    (eventQuery.data as any)?.location?.id_location ??
    null;
  return { edId, locationId, divisions };
}

export default function ScheduleKnobsRoute() {
  const { edId, locationId, divisions } = useScheduleRouteContext();

  return (
    <View className="p-4">
      <EventScheduleTab
        eventDivisionId={edId}
        locationId={locationId}
        section="knobs"
        divisions={divisions}
      />
    </View>
  );
}
