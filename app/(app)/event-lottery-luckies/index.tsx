import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EventLuckyOnesApiService } from '@/services/api/eventLuckyOnesApi';
import { ApiEventLuckyOne } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new EventLuckyOnesApiService();

export default function LuckiesPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getLuckyOnes(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeleteLuckyOnes(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/event-lottery-luckies/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/event-lottery-luckies/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEventLuckyOne>({
    resourceName: 'EventLotteryLucky',
    resourceDisplayName: 'Lucky',
    sectionLabel: 'Lucky Ones',
    sectionHref: '/event-lottery-luckies',
    fetchData,
    bulkDelete,
    title: 'Lucky Ones',
    description: 'Manage drawn luckies',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
