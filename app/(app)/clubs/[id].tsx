import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { ClubsApiService } from '@/services/api/clubsApi';
import { ApiClub } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new ClubsApiService();

export default function ViewClubPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getClub(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiClub>) => {
      return api.updateClub(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiClub>({
    resourceName: 'Club',
    resourceDisplayName: 'Club',
    sectionLabel: 'Clubs',
    sectionHref: '/clubs',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
