import ResourceListPage from '@/components/pages/ResourceListPage';
import EventParticipationMappingButton from '@/components/events/EventParticipationMappingButton';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { queryKeys } from '@/lib/queryClient';
import { EventRegistrationsApiService } from '@/services/api/eventRegistrationsApi';
import { EventsApiService } from '@/services/api/eventsApi';
import { ApiEventRegistration } from '@/types/api/entities';
import { withSearchParams } from '@/utils/withSearchParams';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Text, View } from 'react-native';

const registrationsApi = new EventRegistrationsApiService();
const eventsApi = new EventsApiService();

export default function EventRegistrationsTab() {
  const router = useRouter();
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

  const mutationsDisabled = !!eventQuery.data?.finalized_at;

  const fetchData = useCallback(
    async (params: any) => {
      const response = await registrationsApi.getRegistrations({
        ...params,
        filters: { ...params?.filters, event_id: eventId },
      });
      return {
        data: response.data,
        meta: response.meta,
        links: (response as any).links,
      };
    },
    [eventId]
  );

  const handleAdd = useCallback(() => {
    router.push(
      withSearchParams('/event-registrations/add', {
        event_id: eventId,
      }) as any
    );
  }, [eventId, router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/event-registrations/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEventRegistration>({
    resourceName: 'EventRegistration',
    resourceDisplayName: 'Registration',
    fetchData,
    excludeFields: ['event_id'],
    title: 'Registrations',
    description: 'Registrations for this event',
    onAdd: handleAdd,
    onView: handleView,
    // Registrations are cancelled or declined from the detail page; the backend
    // answers 405 on hard delete.
    enableBulkDelete: false,
    enableBulkExport: true,
    embedded: true,
    mutationsDisabled,
  });

  return (
    <View className="p-4 flex-1">
      {mutationsDisabled && (
        <Text
          testID="registrations-finalized-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3"
        >
          Event is finalized — registrations cannot be added, cancelled or
          declined.
        </Text>
      )}
      <EventParticipationMappingButton
        eventId={eventId}
        mutationsDisabled={mutationsDisabled}
      />
      <ResourceListPage config={config} />
    </View>
  );
}
