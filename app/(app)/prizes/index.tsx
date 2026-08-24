import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PrizesApiService } from '@/services/api/prizesApi';
import { ApiPrize } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const prizesApi = new PrizesApiService();

export default function PrizesPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await prizesApi.getPrizes(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return prizesApi.bulkDeletePrizes(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/prizes/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/prizes/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPrize>({
    resourceName: 'Prize',
    resourceDisplayName: 'Prize',
    sectionLabel: 'Prizes',
    sectionHref: '/prizes',
    fetchData,
    bulkDelete,
    title: 'Prizes',
    description: 'Manage tournament prizes',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
