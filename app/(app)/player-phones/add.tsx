import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { PlayerPhonesApiService } from '@/services/api/playerPhonesApi';
import { ApiPlayerPhone } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PlayerPhonesApiService();

export default function AddPlayerPhonePage() {
  const createResource = useCallback(async (data: Partial<ApiPlayerPhone>) => {
    return api.createPhone(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiPlayerPhone>({
    resourceName: 'UserPhone',
    resourceDisplayName: 'Phone',
    sectionLabel: 'Player phones',
    sectionHref: '/player-phones',
    createResource,
    getViewPath: id => '/player-phones/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
