import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EditionParticipationsApiService } from '@/services/api/editionParticipationsApi';
import { ApiEditionParticipation } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionParticipationsApiService();

export default function AddEditionParticipationPage() {
  const createResource = useCallback(async (data: Partial<ApiEditionParticipation>) => {
    return api.createParticipation(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEditionParticipation>({
    resourceName: 'EditionParticipation',
    resourceDisplayName: 'Participation',
    createResource,
    getViewPath: id => '/edition-participations/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
