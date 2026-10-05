import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EventDivisionsApiService } from '@/services/api/eventDivisionsApi';
import { ApiEventDivision } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const eventDivisionsApi = new EventDivisionsApiService();

export default function EventDivisionsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await eventDivisionsApi.getEventDivisions(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return eventDivisionsApi.bulkDeleteEventDivisions(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/event-divisions/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/event-divisions/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEventDivision>({
    resourceName: 'EventDivision',
    resourceDisplayName: 'Event Division',
    sectionLabel: 'Event Divisions',
    sectionHref: '/event-divisions',
    fetchData,
    bulkDelete,
    title: 'Event Divisions',
    description: 'Manage event–division pairings',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
