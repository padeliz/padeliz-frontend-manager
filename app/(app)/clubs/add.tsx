import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { ClubsApiService } from '@/services/api/clubsApi';
import { ApiClub } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new ClubsApiService();

export default function AddClubPage() {
  const createResource = useCallback(async (data: Partial<ApiClub>) => {
    return api.createClub(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiClub>({
    resourceName: 'Club',
    resourceDisplayName: 'Club',
    createResource,
    getViewPath: id => '/clubs/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
