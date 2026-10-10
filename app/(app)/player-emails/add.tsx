import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { PlayerEmailsApiService } from '@/services/api/playerEmailsApi';
import { ApiPlayerEmail } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PlayerEmailsApiService();

export default function AddPlayerEmailPage() {
  const createResource = useCallback(async (data: Partial<ApiPlayerEmail>) => {
    return api.createEmail(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiPlayerEmail>({
    resourceName: 'PlayerEmail',
    resourceDisplayName: 'Email',
    sectionLabel: 'Player emails',
    sectionHref: '/player-emails',
    createResource,
    getViewPath: id => '/player-emails/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
