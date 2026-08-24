import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { ApiDivision } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new DivisionsApiService();

export default function ViewDivisionPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getDivision(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiDivision>) => {
      return api.updateDivision(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiDivision>({
    resourceName: 'Division',
    resourceDisplayName: 'Division',
    sectionLabel: 'Divisions',
    sectionHref: '/divisions',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
