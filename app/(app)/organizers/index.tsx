import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { OrganizersApiService } from '@/services/api/organizersApi';
import { ApiOrganizer } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const organizersApi = new OrganizersApiService();

export default function OrganizersPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await organizersApi.getOrganizers(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return organizersApi.bulkDeleteOrganizers(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/organizers/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/organizers/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiOrganizer>({
    resourceName: 'Organizer',
    resourceDisplayName: 'Organizer',
    fetchData,
    bulkDelete,
    title: 'Organizers Management',
    description: 'Manage poster branding organizers',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
