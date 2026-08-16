import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PrizesFromClubsApiService } from '@/services/api/prizesFromClubsApi';
import { ApiPrizeFromClub } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PrizesFromClubsApiService();

export default function PrizesFromClubsPage() {
  const fetchData = useCallback(async (params: any) => {
    const response = await api.getPrizeFromClubs(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeletePrizeFromClubs(ids as number[]);
  }, []);

  const config = useResourcePageConfig<ApiPrizeFromClub>({
    resourceName: 'PrizeFromClub',
    resourceDisplayName: 'Club Prize',
    fetchData,
    bulkDelete,
    title: 'Prizes from Clubs',
    description: 'Manage club-specific prize variants',
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
