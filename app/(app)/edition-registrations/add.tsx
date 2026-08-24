import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EditionRegistrationsApiService } from '@/services/api/editionRegistrationsApi';
import { ApiEditionRegistration } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionRegistrationsApiService();

export default function AddEditionRegistrationPage() {
  const createResource = useCallback(async (data: Partial<ApiEditionRegistration>) => {
    return api.createRegistration(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEditionRegistration>({
    resourceName: 'EditionRegistration',
    resourceDisplayName: 'Registration',
    sectionLabel: 'Registrations',
    sectionHref: '/edition-registrations',
    createResource,
    getViewPath: id => '/edition-registrations/' + id,
    seedFromQuery: true,
  });

  return <ResourceCreatePage config={config} />;
}
