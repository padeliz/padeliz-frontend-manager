import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EventParticipationsApiService } from '@/services/api/eventParticipationsApi';
import { ApiEventParticipation } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const participationsApi = new EventParticipationsApiService();

export default function EventParticipationsPage() {
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
    router.push('/event-participations/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/event-participations/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEventParticipation>({
    resourceName: 'EventParticipation',
    resourceDisplayName: 'Participation',
    sectionLabel: 'Participations',
    sectionHref: '/event-participations',
    fetchData,
    bulkDelete,
    title: 'Participations',
    description: 'Manage event participations',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
