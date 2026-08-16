import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PrizesApiService } from '@/services/api/prizesApi';
import { ApiPrize } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PrizesApiService();

export default function ViewPrizePage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getPrize(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiPrize>) => {
      return api.updatePrize(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiPrize>({
    resourceName: 'Prize',
    resourceDisplayName: 'Prize',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
