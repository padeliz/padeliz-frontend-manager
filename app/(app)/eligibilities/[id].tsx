import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayerEligibilitiesApiService } from '@/services/api/playerEligibilitiesApi';
import { ApiPlayerEligibility } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PlayerEligibilitiesApiService();

export default function ViewEligibilityPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getPlayerEligibility(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiPlayerEligibility>) => {
      return api.updatePlayerEligibility(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiPlayerEligibility>({
    resourceName: 'Eligibility',
    resourceDisplayName: 'Eligibility',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
