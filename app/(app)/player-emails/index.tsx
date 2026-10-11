import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerEmailsApiService } from '@/services/api/playerEmailsApi';
import { ApiPlayerEmail } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new PlayerEmailsApiService();

export default function PlayerEmailsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getEmails(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeleteEmails(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/player-emails/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/player-emails/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerEmail>({
    resourceName: 'UserEmail',
    resourceDisplayName: 'Email',
    sectionLabel: 'Player emails',
    sectionHref: '/player-emails',
    fetchData,
    bulkDelete,
    title: 'Player emails',
    description: 'Manage player email addresses',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
