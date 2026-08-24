import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { LocationsApiService } from '@/services/api/locationsApi';
import { ApiLocation } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new LocationsApiService();

export default function AddLocationPage() {
  const createResource = useCallback(async (data: Partial<ApiLocation>) => {
    return api.createLocation(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiLocation>({
    resourceName: 'Location',
    resourceDisplayName: 'Location',
    sectionLabel: 'Locations',
    sectionHref: '/locations',
    createResource,
    getViewPath: id => '/locations/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
