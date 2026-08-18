import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerImportApiService } from '@/services/api/playerImportApi';
import { ApiPlayerImport } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const importsApi = new PlayerImportApiService();

export default function PlayerImportsListPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await importsApi.getImports(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/players/imports/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerImport>({
    resourceName: 'PlayerImport',
    resourceDisplayName: 'Import',
    fetchData,
    title: 'Player Imports',
    description: 'CSV import history',
    onView: handleView,
    initialPage: 1,
    initialPerPage: 10,
    enableBulkDelete: false,
    enableBulkExport: true,
    embedded: true,
  });

  return <ResourceListPage config={config} />;
}
