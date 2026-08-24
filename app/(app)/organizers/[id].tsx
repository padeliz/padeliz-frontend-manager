import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { OrganizersApiService } from '@/services/api/organizersApi';
import { ApiOrganizer } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new OrganizersApiService();

export default function ViewOrganizerPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getOrganizer(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiOrganizer>) => {
      return api.updateOrganizer(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiOrganizer>({
    resourceName: 'Organizer',
    resourceDisplayName: 'Organizer',
    sectionLabel: 'Organizers',
    sectionHref: '/organizers',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
