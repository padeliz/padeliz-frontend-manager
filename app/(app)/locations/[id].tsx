import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { LocationsApiService } from '@/services/api/locationsApi';
import { ApiLocation } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new LocationsApiService();

export default function ViewLocationPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getLocation(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiLocation>) => {
      return api.updateLocation(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiLocation>({
    resourceName: 'Location',
    resourceDisplayName: 'Location',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
