import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EventRegistrationsApiService } from '@/services/api/eventRegistrationsApi';
import { ApiEventRegistration } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const registrationsApi = new EventRegistrationsApiService();

export default function EventRegistrationsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await registrationsApi.getRegistrations(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/event-registrations/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/event-registrations/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEventRegistration>({
    resourceName: 'EventRegistration',
    resourceDisplayName: 'Registration',
    sectionLabel: 'Registrations',
    sectionHref: '/event-registrations',
    fetchData,
    title: 'Registrations',
    description: 'Manage event registrations',
    onAdd: handleAdd,
    onView: handleView,
    // Registrations are cancelled or declined from the detail page; the backend
    // answers 405 on hard delete.
    enableBulkDelete: false,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
