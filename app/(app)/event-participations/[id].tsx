import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EventParticipationsApiService } from '@/services/api/eventParticipationsApi';
import { ApiEventParticipation } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventParticipationsApiService();

export default function ViewEventParticipationPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getParticipation(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEventParticipation>) => {
      return api.updateParticipation(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEventParticipation>({
    resourceName: 'EventParticipation',
    resourceDisplayName: 'Participation',
    sectionLabel: 'Participations',
    sectionHref: '/event-participations',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
