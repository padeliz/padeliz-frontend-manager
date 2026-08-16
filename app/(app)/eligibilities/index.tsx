import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerEligibilitiesApiService } from '@/services/api/playerEligibilitiesApi';
import { ApiPlayerEligibility } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new PlayerEligibilitiesApiService();

export default function EligibilitiesPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getPlayerEligibilities(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeletePlayerEligibilities(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/eligibilities/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/eligibilities/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerEligibility>({
    resourceName: 'Eligibility',
    resourceDisplayName: 'Eligibility',
    fetchData,
    bulkDelete,
    title: 'Player Eligibilities',
    description: 'Manage player eligibility reviews',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
