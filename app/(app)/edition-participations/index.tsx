import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EditionParticipationsApiService } from '@/services/api/editionParticipationsApi';
import { ApiEditionParticipation } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const participationsApi = new EditionParticipationsApiService();

export default function EditionParticipationsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await participationsApi.getParticipations(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return participationsApi.bulkDeleteParticipations(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/edition-participations/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/edition-participations/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEditionParticipation>({
    resourceName: 'EditionParticipation',
    resourceDisplayName: 'Participation',
    sectionLabel: 'Participations',
    sectionHref: '/edition-participations',
    fetchData,
    bulkDelete,
    title: 'Participations',
    description: 'Manage edition participations',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
