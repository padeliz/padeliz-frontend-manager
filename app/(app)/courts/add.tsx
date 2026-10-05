import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { CourtsApiService } from '@/services/api/courtsApi';
import { ApiCourt } from '@/types/api/event';
import React, { useCallback } from 'react';

const api = new CourtsApiService();

export default function AddCourtPage() {
  const createResource = useCallback(async (data: Partial<ApiCourt>) => {
    return api.createCourt(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiCourt>({
    resourceName: 'Court',
    resourceDisplayName: 'Court',
    sectionLabel: 'Courts',
    sectionHref: '/courts',
    createResource,
    getViewPath: id => '/courts/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
