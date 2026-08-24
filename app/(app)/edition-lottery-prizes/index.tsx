import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EditionLotteryPrizesApiService } from '@/services/api/editionLotteryPrizesApi';
import { ApiEditionLotteryPrize } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new EditionLotteryPrizesApiService();

export default function EditionLotteryPrizesPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getLotteryPrizes(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeleteLotteryPrizes(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/edition-lottery-prizes/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/edition-lottery-prizes/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEditionLotteryPrize>({
    resourceName: 'EditionLotteryPrize',
    resourceDisplayName: 'Lottery Prize',
    sectionLabel: 'Lottery Prizes',
    sectionHref: '/edition-lottery-prizes',
    fetchData,
    bulkDelete,
    title: 'Lottery Prizes',
    description: 'Manage lottery prize lines',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
