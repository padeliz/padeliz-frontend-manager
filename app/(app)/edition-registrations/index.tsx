import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EditionRegistrationsApiService } from '@/services/api/editionRegistrationsApi';
import { ApiEditionRegistration } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const registrationsApi = new EditionRegistrationsApiService();

export default function EditionRegistrationsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await registrationsApi.getRegistrations(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return registrationsApi.bulkDeleteRegistrations(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/edition-registrations/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/edition-registrations/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEditionRegistration>({
    resourceName: 'EditionRegistration',
    resourceDisplayName: 'Registration',
    sectionLabel: 'Registrations',
    sectionHref: '/edition-registrations',
    fetchData,
    bulkDelete,
    title: 'Registrations',
    description: 'Manage edition registrations',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
