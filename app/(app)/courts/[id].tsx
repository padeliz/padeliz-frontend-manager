import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { CourtsApiService } from '@/services/api/courtsApi';
import { ApiCourt } from '@/types/api/event';
import React, { useCallback } from 'react';

const api = new CourtsApiService();

export default function ViewCourtPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getCourt(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiCourt>) => {
      return api.updateCourt(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiCourt>({
    resourceName: 'Court',
    resourceDisplayName: 'Court',
    sectionLabel: 'Courts',
    sectionHref: '/courts',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
