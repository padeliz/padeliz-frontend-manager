import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EditionLotteriesApiService } from '@/services/api/editionLotteriesApi';
import { ApiEditionLottery } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new EditionLotteriesApiService();

export default function LotteriesPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getLotteries(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeleteLotteries(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/edition-lotteries/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/edition-lotteries/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEditionLottery>({
    resourceName: 'EditionLottery',
    resourceDisplayName: 'Lottery',
    sectionLabel: 'Lotteries',
    sectionHref: '/edition-lotteries',
    fetchData,
    bulkDelete,
    title: 'Lotteries',
    description: 'Manage edition lotteries',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
