import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { SponsorsApiService } from '@/services/api/sponsorsApi';
import { ApiSponsor } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new SponsorsApiService();

export default function AddSponsorPage() {
  const createResource = useCallback(async (data: Partial<ApiSponsor>) => {
    return api.createSponsor(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiSponsor>({
    resourceName: 'Sponsor',
    resourceDisplayName: 'Sponsor',
    createResource,
    getViewPath: id => '/sponsors/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
