import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { ApiEventDivision } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventDivisionsApiService();

export default function AddEventDivisionPage() {
  const createResource = useCallback(async (data: Partial<ApiEventDivision>) => {
    return api.createEventDivision(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEventDivision>({
    resourceName: 'EventDivision',
    resourceDisplayName: 'Event Division',
    sectionLabel: 'Event Divisions',
    sectionHref: '/event-divisions',
    createResource,
    getViewPath: id => '/event-divisions/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
