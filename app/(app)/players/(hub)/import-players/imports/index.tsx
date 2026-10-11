import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { UserImportApiService } from '@/services/api/userImportApi';
import { ApiUserImport } from '@/types/api/entities';

const importsApi = new UserImportApiService();

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
      router.push(`/players/import-players/imports/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiUserImport>({
    resourceName: 'UserImport',
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
