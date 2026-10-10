import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayerPhonesApiService } from '@/services/api/playerPhonesApi';
import { ApiPlayerPhone } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PlayerPhonesApiService();

export default function ViewPlayerPhonePage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getPhone(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiPlayerPhone>) => {
      return api.updatePhone(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiPlayerPhone>({
    resourceName: 'PlayerPhone',
    resourceDisplayName: 'Phone',
    sectionLabel: 'Player phones',
    sectionHref: '/player-phones',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
