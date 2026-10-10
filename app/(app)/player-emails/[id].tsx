import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayerEmailsApiService } from '@/services/api/playerEmailsApi';
import { ApiPlayerEmail } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PlayerEmailsApiService();

export default function ViewPlayerEmailPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getEmail(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiPlayerEmail>) => {
      return api.updateEmail(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiPlayerEmail>({
    resourceName: 'PlayerEmail',
    resourceDisplayName: 'Email',
    sectionLabel: 'Player emails',
    sectionHref: '/player-emails',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
