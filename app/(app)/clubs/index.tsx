import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { ClubsApiService } from '@/services/api/clubsApi';
import { ApiClub } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const clubsApi = new ClubsApiService();

export default function ClubsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await clubsApi.getClubs(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return clubsApi.bulkDeleteClubs(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/clubs/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/clubs/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiClub>({
    resourceName: 'Club',
    resourceDisplayName: 'Club',
    sectionLabel: 'Clubs',
    sectionHref: '/clubs',
    fetchData,
    bulkDelete,
    title: 'Clubs',
    description: 'Manage padel clubs',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
