import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerCustomFieldValueImportApiService } from '@/services/api/playerCustomFieldValueImportApi';
import { ApiPlayerCustomFieldValueImport } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const importsApi = new PlayerCustomFieldValueImportApiService();

export default function CustomFieldValueImportsListPage() {
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
      router.push(
        `/players/import-custom-field-values/imports/${id}` as any
      );
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerCustomFieldValueImport>({
    resourceName: 'PlayerCustomFieldValueImport',
    resourceDisplayName: 'Import',
    fetchData,
    title: 'Custom Field Value Imports',
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
