import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { SponsorsApiService } from '@/services/api/sponsorsApi';
import { ApiSponsor } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new SponsorsApiService();

export default function SponsorsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getSponsors(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeleteSponsors(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/sponsors/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/sponsors/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiSponsor>({
    resourceName: 'Sponsor',
    resourceDisplayName: 'Sponsor',
    fetchData,
    bulkDelete,
    title: 'Sponsors',
    description: 'Manage lottery sponsors',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
