import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { SponsorsApiService } from '@/services/api/sponsorsApi';
import { ApiSponsor } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new SponsorsApiService();

export default function ViewSponsorPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getSponsor(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiSponsor>) => {
      return api.updateSponsor(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiSponsor>({
    resourceName: 'Sponsor',
    resourceDisplayName: 'Sponsor',
    sectionLabel: 'Sponsors',
    sectionHref: '/sponsors',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
