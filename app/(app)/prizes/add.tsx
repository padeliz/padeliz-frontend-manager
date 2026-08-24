import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { PrizesApiService } from '@/services/api/prizesApi';
import { ApiPrize } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PrizesApiService();

export default function AddPrizePage() {
  const createResource = useCallback(async (data: Partial<ApiPrize>) => {
    return api.createPrize(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiPrize>({
    resourceName: 'Prize',
    resourceDisplayName: 'Prize',
    sectionLabel: 'Prizes',
    sectionHref: '/prizes',
    createResource,
    getViewPath: id => '/prizes/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
