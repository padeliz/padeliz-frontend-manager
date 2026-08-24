import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EditionParticipationsApiService } from '@/services/api/editionParticipationsApi';
import { ApiEditionParticipation } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionParticipationsApiService();

export default function ViewEditionParticipationPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getParticipation(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEditionParticipation>) => {
      return api.updateParticipation(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEditionParticipation>({
    resourceName: 'EditionParticipation',
    resourceDisplayName: 'Participation',
    sectionLabel: 'Participations',
    sectionHref: '/edition-participations',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
