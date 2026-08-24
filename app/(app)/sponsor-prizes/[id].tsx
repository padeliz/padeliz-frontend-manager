import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { SponsorPrizesApiService } from '@/services/api/sponsorPrizesApi';
import { ApiSponsorPrize } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new SponsorPrizesApiService();

export default function ViewSponsorPrizePage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getSponsorPrize(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiSponsorPrize>) => {
      return api.updateSponsorPrize(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiSponsorPrize>({
    resourceName: 'SponsorPrize',
    resourceDisplayName: 'Sponsor Prize',
    sectionLabel: 'Sponsor Prizes',
    sectionHref: '/sponsor-prizes',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
