import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { LevelsApiService } from '@/services/api/levelsApi';
import { ApiLevel } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new LevelsApiService();

/** Read-only seeded level bands (no add, edit or delete). */
export default function LevelsPage() {
  const fetchData = useCallback(async (params: any) => {
    const response = await api.getLevels(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const config = useResourcePageConfig<ApiLevel>({
    resourceName: 'Level',
    resourceDisplayName: 'Level',
    sectionLabel: 'Levels',
    sectionHref: '/levels',
    fetchData,
    title: 'Levels',
    description: 'Seeded player level bands (read-only)',
    enableBulkDelete: false,
    enableBulkExport: false,
  });

  return <ResourceListPage config={config} />;
}
