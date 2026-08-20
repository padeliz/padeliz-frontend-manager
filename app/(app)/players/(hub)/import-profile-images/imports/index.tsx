import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerProfileImageImportApiService } from '@/services/api/playerProfileImageImportApi';
import { ApiPlayerProfileImageImport } from '@/types/api/entities';

const importsApi = new PlayerProfileImageImportApiService();

export default function PlayerProfileImageImportsListPage() {
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
      router.push(`/players/import-profile-images/imports/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerProfileImageImport>({
    resourceName: 'PlayerProfileImageImport',
    resourceDisplayName: 'Profile Image Import',
    fetchData,
    title: 'Profile Image Imports',
    description: 'Bulk profile image import history',
    onView: handleView,
    initialPage: 1,
    initialPerPage: 10,
    enableBulkDelete: false,
    enableBulkExport: true,
    embedded: true,
  });

  return <ResourceListPage config={config} />;
}
