import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { PlayerIdentitiesApiService } from '@/services/api/playerIdentitiesApi';
import { ApiPlayerIdentity } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PlayerIdentitiesApiService();

/** The provider link itself (player, provider, subject) is immutable on the API. */
const READ_ONLY_FIELDS = [
  'user_id',
  'provider',
  'provider_subject',
  'linked_at',
  'last_login_at',
];

export default function ViewPlayerIdentityPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getIdentity(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiPlayerIdentity>) => {
      return api.updateIdentity(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiPlayerIdentity>({
    resourceName: 'UserIdentity',
    resourceDisplayName: 'Identity',
    sectionLabel: 'Player identities',
    sectionHref: '/player-identities',
    fetchResource,
    updateResource,
    readOnlyFields: READ_ONLY_FIELDS,
  });

  return <ResourceViewPage config={config} />;
}
