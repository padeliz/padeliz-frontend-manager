import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { OrganizersApiService } from '@/services/api/organizersApi';
import { ApiOrganizer } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new OrganizersApiService();

export default function AddOrganizerPage() {
  const createResource = useCallback(async (data: Partial<ApiOrganizer>) => {
    return api.createOrganizer(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiOrganizer>({
    resourceName: 'Organizer',
    resourceDisplayName: 'Organizer',
    sectionLabel: 'Organizers',
    sectionHref: '/organizers',
    createResource,
    getViewPath: id => '/organizers/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
