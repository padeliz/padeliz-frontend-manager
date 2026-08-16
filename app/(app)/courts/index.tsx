import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { CourtsApiService } from '@/services/api/courtsApi';
import { ApiCourt } from '@/types/api/edition';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new CourtsApiService();

export default function CourtsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getCourts(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeleteCourts(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/courts/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/courts/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiCourt>({
    resourceName: 'Court',
    resourceDisplayName: 'Court',
    fetchData,
    bulkDelete,
    title: 'Courts',
    description: 'Manage courts',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
