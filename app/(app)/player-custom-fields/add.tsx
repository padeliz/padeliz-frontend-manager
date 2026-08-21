import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { PlayerCustomFieldsApiService } from '@/services/api/playerCustomFieldsApi';
import { ApiPlayerCustomField } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new PlayerCustomFieldsApiService();

export default function AddPlayerCustomFieldPage() {
  const createResource = useCallback(async (data: Partial<ApiPlayerCustomField>) => {
    return api.createPlayerCustomField(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiPlayerCustomField>({
    resourceName: 'PlayerCustomField',
    resourceDisplayName: 'Custom Field',
    createResource,
    excludeFields: ['rules_json'],
    getViewPath: id => `/player-custom-fields/${id}`,
  });

  return <ResourceCreatePage config={config} />;
}
