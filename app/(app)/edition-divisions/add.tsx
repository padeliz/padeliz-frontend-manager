import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { ApiEditionDivision } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionDivisionsApiService();

export default function AddEditionDivisionPage() {
  const createResource = useCallback(async (data: Partial<ApiEditionDivision>) => {
    return api.createEditionDivision(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEditionDivision>({
    resourceName: 'EditionDivision',
    resourceDisplayName: 'Edition Division',
    sectionLabel: 'Edition Divisions',
    sectionHref: '/edition-divisions',
    createResource,
    getViewPath: id => '/edition-divisions/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
