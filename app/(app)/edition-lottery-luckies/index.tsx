import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EditionLuckyOnesApiService } from '@/services/api/editionLuckyOnesApi';
import { ApiEditionLuckyOne } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new EditionLuckyOnesApiService();

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
    router.push('/edition-lottery-luckies/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/edition-lottery-luckies/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEditionLuckyOne>({
    resourceName: 'EditionLotteryLucky',
    resourceDisplayName: 'Lucky',
    fetchData,
    bulkDelete,
    title: 'Lottery Luckies',
    description: 'Manage drawn luckies',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
