import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { ApiDivision } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const divisionsApi = new DivisionsApiService();

export default function DivisionsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await divisionsApi.getDivisions(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return divisionsApi.bulkDeleteDivisions(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/divisions/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/divisions/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiDivision>({
    resourceName: 'Division',
    resourceDisplayName: 'Division',
    sectionLabel: 'Divisions',
    sectionHref: '/divisions',
    fetchData,
    bulkDelete,
    title: 'Divisions',
    description: 'Manage skill divisions',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
