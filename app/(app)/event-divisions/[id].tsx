import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { ApiEventDivision } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventDivisionsApiService();

export default function ViewEventDivisionPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getEventDivision(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEventDivision>) => {
      return api.updateEventDivision(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEventDivision>({
    resourceName: 'EventDivision',
    resourceDisplayName: 'Event Division',
    sectionLabel: 'Event Divisions',
    sectionHref: '/event-divisions',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
