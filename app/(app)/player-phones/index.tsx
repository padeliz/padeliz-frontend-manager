import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerPhonesApiService } from '@/services/api/playerPhonesApi';
import { ApiPlayerPhone } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new PlayerPhonesApiService();

export default function PlayerPhonesPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getPhones(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeletePhones(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/player-phones/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/player-phones/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerPhone>({
    resourceName: 'PlayerPhone',
    resourceDisplayName: 'Phone',
    sectionLabel: 'Player phones',
    sectionHref: '/player-phones',
    fetchData,
    bulkDelete,
    title: 'Player phones',
    description: 'Manage player phone numbers',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
