import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerIdentitiesApiService } from '@/services/api/playerIdentitiesApi';
import { ApiPlayerIdentity } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new PlayerIdentitiesApiService();

/**
 * Identities are linked by players in the App (OAuth / SMS): list, view, edit
 * and delete only. No add page and no create button (`onAdd` is omitted).
 */
export default function PlayerIdentitiesPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getIdentities(params);
    return {
      data: response.data,
      meta: response.meta,
      links: response.links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeleteIdentities(ids as number[]);
  }, []);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/player-identities/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerIdentity>({
    resourceName: 'PlayerIdentity',
    resourceDisplayName: 'Identity',
    sectionLabel: 'Player identities',
    sectionHref: '/player-identities',
    fetchData,
    bulkDelete,
    title: 'Player identities',
    description: 'Review and edit sign-in identities linked by players',
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
