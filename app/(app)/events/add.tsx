import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EventsApiService } from '@/services/api/eventsApi';
import { ApiEvent } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventsApiService();

export default function AddEventPage() {
  const createResource = useCallback(async (data: Partial<ApiEvent>) => {
    return api.createEvent(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEvent>({
    resourceName: 'Event',
    resourceDisplayName: 'Event',
    sectionLabel: 'Events',
    sectionHref: '/events',
    createResource,
    excludeFields: ['entry_fee', 'students_entry_fee'],
    getViewPath: id => '/events/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
