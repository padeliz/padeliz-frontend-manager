import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerCustomFieldsApiService } from '@/services/api/playerCustomFieldsApi';
import { ApiPlayerCustomField } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new PlayerCustomFieldsApiService();

export default function PlayerCustomFieldsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getPlayerCustomFields(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeletePlayerCustomFields(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/player-custom-fields/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/player-custom-fields/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerCustomField>({
    resourceName: 'PlayerCustomField',
    resourceDisplayName: 'Custom Field',
    sectionLabel: 'Custom fields',
    sectionHref: '/player-custom-fields',
    fetchData,
    bulkDelete,
    title: 'Custom Fields',
    description: 'Manage player custom field definitions',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
