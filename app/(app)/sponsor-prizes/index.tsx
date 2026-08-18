import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { SponsorPrizesApiService } from '@/services/api/sponsorPrizesApi';
import { ApiSponsorPrize } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new SponsorPrizesApiService();

export default function SponsorPrizesPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getSponsorPrizes(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeleteSponsorPrizes(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/sponsor-prizes/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/sponsor-prizes/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiSponsorPrize>({
    resourceName: 'SponsorPrize',
    resourceDisplayName: 'Sponsor Prize',
    fetchData,
    bulkDelete,
    title: 'Sponsor Prizes',
    description: 'Manage sponsor prize overlays',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
