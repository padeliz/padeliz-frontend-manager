import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { PlayerEligibilitiesApiService } from '@/services/api/playerEligibilitiesApi';
import { ApiPlayerEligibility } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PlayerEligibilitiesApiService();

export default function AddEligibilityPage() {
  const createResource = useCallback(async (data: Partial<ApiPlayerEligibility>) => {
    return api.createPlayerEligibility(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiPlayerEligibility>({
    resourceName: 'Eligibility',
    resourceDisplayName: 'Eligibility',
    createResource,
    getViewPath: id => '/eligibilities/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
