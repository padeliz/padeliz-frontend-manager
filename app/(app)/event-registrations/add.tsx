import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EventRegistrationsApiService } from '@/services/api/eventRegistrationsApi';
import { ApiEventRegistration } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventRegistrationsApiService();

export default function AddEventRegistrationPage() {
  const createResource = useCallback(async (data: Partial<ApiEventRegistration>) => {
    return api.createRegistration(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEventRegistration>({
    resourceName: 'EventRegistration',
    resourceDisplayName: 'Registration',
    sectionLabel: 'Registrations',
    sectionHref: '/event-registrations',
    createResource,
    getViewPath: id => '/event-registrations/' + id,
    seedFromQuery: true,
  });

  return <ResourceCreatePage config={config} />;
}
