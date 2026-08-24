import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { SponsorPrizesApiService } from '@/services/api/sponsorPrizesApi';
import { ApiSponsorPrize } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new SponsorPrizesApiService();

export default function AddSponsorPrizePage() {
  const createResource = useCallback(async (data: Partial<ApiSponsorPrize>) => {
    return api.upsertSponsorPrize(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiSponsorPrize>({
    resourceName: 'SponsorPrize',
    resourceDisplayName: 'Sponsor Prize',
    sectionLabel: 'Sponsor Prizes',
    sectionHref: '/sponsor-prizes',
    createResource,
    getViewPath: id => '/sponsor-prizes/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
