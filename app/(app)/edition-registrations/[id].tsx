import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EditionRegistrationsApiService } from '@/services/api/editionRegistrationsApi';
import { ApiEditionRegistration } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionRegistrationsApiService();

export default function ViewEditionRegistrationPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getRegistration(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEditionRegistration>) => {
      return api.updateRegistration(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEditionRegistration>({
    resourceName: 'EditionRegistration',
    resourceDisplayName: 'Registration',
    sectionLabel: 'Registrations',
    sectionHref: '/edition-registrations',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
