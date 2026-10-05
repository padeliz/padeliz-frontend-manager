import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EventParticipationsApiService } from '@/services/api/eventParticipationsApi';
import { ApiEventParticipation } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventParticipationsApiService();

export default function AddEventParticipationPage() {
  const createResource = useCallback(async (data: Partial<ApiEventParticipation>) => {
    return api.createParticipation(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEventParticipation>({
    resourceName: 'EventParticipation',
    resourceDisplayName: 'Participation',
    sectionLabel: 'Participations',
    sectionHref: '/event-participations',
    createResource,
    getViewPath: id => '/event-participations/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
