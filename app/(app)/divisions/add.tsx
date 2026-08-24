import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { ApiDivision } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new DivisionsApiService();

export default function AddDivisionPage() {
  const createResource = useCallback(async (data: Partial<ApiDivision>) => {
    return api.createDivision(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiDivision>({
    resourceName: 'Division',
    resourceDisplayName: 'Division',
    sectionLabel: 'Divisions',
    sectionHref: '/divisions',
    createResource,
    getViewPath: id => '/divisions/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
