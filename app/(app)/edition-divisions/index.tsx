import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { ApiEditionDivision } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const editionDivisionsApi = new EditionDivisionsApiService();

export default function EditionDivisionsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await editionDivisionsApi.getEditionDivisions(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return editionDivisionsApi.bulkDeleteEditionDivisions(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/edition-divisions/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/edition-divisions/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEditionDivision>({
    resourceName: 'EditionDivision',
    resourceDisplayName: 'Edition Division',
    sectionLabel: 'Edition Divisions',
    sectionHref: '/edition-divisions',
    fetchData,
    bulkDelete,
    title: 'Edition Divisions',
    description: 'Manage edition–division pairings',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
