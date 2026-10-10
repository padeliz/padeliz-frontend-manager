import EventParticipationsTab from '@/components/events/EventParticipationsTab';
import { queryKeys } from '@/lib/queryClient';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { EventParticipationsApiService } from '@/services/api/eventParticipationsApi';
import { EventsApiService } from '@/services/api/eventsApi';
import { PlayerCustomFieldsApiService } from '@/services/api/playerCustomFieldsApi';
import { ApiEventParticipationSummary } from '@/types/api/entities';
import { parseEventDivisionId } from '@/utils/eventWorkspace';
import { fetchAllPaginated } from '@/utils/fetchAllPaginated';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const eventsApi = new EventsApiService();
const eventDivisionsApi = new EventDivisionsApiService();
const participationsApi = new EventParticipationsApiService();
const playerCustomFieldsApi = new PlayerCustomFieldsApiService();

type ParticipationsQueryData = {
  participations: Awaited<
    ReturnType<EventParticipationsApiService['getParticipations']>
  >['data'];
  eventSummary?: ApiEventParticipationSummary;
};

export default function EventParticipationsRoute() {
  const params = useLocalSearchParams<{ id: string; ed?: string }>();
  const eventId = Number(params.id);
  const [selectedCustomFieldIds, setSelectedCustomFieldIds] = useState<
    number[]
  >([]);

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
    enabled: Number.isFinite(eventId),
  });

  const customFieldsQuery = useQuery({
    queryKey: ['playerCustomFields', 'active'],
    queryFn: async () => {
      const res = await playerCustomFieldsApi.getPlayerCustomFields({
        per_page: 100,
        sort_by: { sort_order: 'asc' },
      });
      return (res.data || []).filter(f => !f.archived_at);
    },
  });

  const customFieldOptions = useMemo(
    () =>
      (customFieldsQuery.data || []).map(f => ({
        label: f.label,
        value: f.id_player_custom_field,
        code: f.code,
        type: f.type,
      })),
    [customFieldsQuery.data]
  );

  const participationsQuery = useQuery({
    queryKey: [
      'eventParticipations',
      eventId,
      [...selectedCustomFieldIds].sort((a, b) => a - b).join(','),
    ],
    queryFn: async (): Promise<ParticipationsQueryData> => {
      const { data, meta } = await fetchAllPaginated(async page => {
        const res = await participationsApi.getParticipations({
          page,
          per_page: 100,
          filters: { event_id: eventId },
          sort_by: { sort_order: 'asc' },
          custom_field_ids:
            selectedCustomFieldIds.length > 0
              ? selectedCustomFieldIds
              : undefined,
        });
        return { data: res.data || [], meta: res.meta };
      });

      return {
        participations: data,
        eventSummary: meta?.event_summary as
          | ApiEventParticipationSummary
          | undefined,
      };
    },
    enabled: Number.isFinite(eventId),
  });

  const divisions = divisionsQuery.data || [];
  const selectedDivisionId = parseEventDivisionId(
    params.ed,
    divisions.map(d => d.id_event_division)
  );
  const eventFinalized = !!eventQuery.data?.finalized_at;
  const eventSummary = participationsQuery.data?.eventSummary;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="p-4">
        <EventParticipationsTab
          eventId={eventId}
          eventFinalized={eventFinalized}
          divisions={divisions}
          participations={participationsQuery.data?.participations || []}
          selectedDivisionId={selectedDivisionId}
          registeredNotParticipatingCount={
            eventSummary?.registered_not_participating_count ?? 0
          }
          participationsLocked={eventSummary?.participations_locked ?? false}
          customFieldOptions={customFieldOptions}
          selectedCustomFieldIds={selectedCustomFieldIds}
          onCustomFieldSelectionChange={setSelectedCustomFieldIds}
          onRefresh={async () => {
            await divisionsQuery.refetch();
            await participationsQuery.refetch();
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}
