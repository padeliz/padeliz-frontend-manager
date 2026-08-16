import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EditionsApiService } from '@/services/api/editionsApi';
import { ApiEdition } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionsApiService();

export default function AddEditionPage() {
  const createResource = useCallback(async (data: Partial<ApiEdition>) => {
    return api.createEdition(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEdition>({
    resourceName: 'Edition',
    resourceDisplayName: 'Edition',
    createResource,
    getViewPath: id => '/editions/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
