import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerLevelAssessmentsApiService } from '@/services/api/playerLevelAssessmentsApi';
import { ApiPlayerLevelAssessment } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new PlayerLevelAssessmentsApiService();

/** Review-only list: players create assessments, managers review them. No add. */
export default function PlayerLevelAssessmentsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getAssessments(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/player-level-assessments/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerLevelAssessment>({
    resourceName: 'PlayerLevelAssessment',
    resourceDisplayName: 'Level assessment',
    sectionLabel: 'Level assessments',
    sectionHref: '/player-level-assessments',
    fetchData,
    title: 'Level assessments',
    description: 'Review player level assessments',
    onView: handleView,
    enableBulkDelete: false,
    enableBulkExport: false,
  });

  return <ResourceListPage config={config} />;
}
