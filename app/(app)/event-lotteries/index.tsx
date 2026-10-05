import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EventLotteriesApiService } from '@/services/api/eventLotteriesApi';
import { ApiEventLottery } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new EventLotteriesApiService();

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
    router.push('/event-lotteries/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/event-lotteries/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEventLottery>({
    resourceName: 'EventLottery',
    resourceDisplayName: 'Lottery',
    sectionLabel: 'Lotteries',
    sectionHref: '/event-lotteries',
    fetchData,
    bulkDelete,
    title: 'Lotteries',
    description: 'Manage event lotteries',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
