import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { ApiEditionDivision } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionDivisionsApiService();

export default function ViewEditionDivisionPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getEditionDivision(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEditionDivision>) => {
      return api.updateEditionDivision(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEditionDivision>({
    resourceName: 'EditionDivision',
    resourceDisplayName: 'Edition Division',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
