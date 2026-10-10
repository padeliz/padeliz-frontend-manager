import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { PlayerStudentProofsApiService } from '@/services/api/playerStudentProofsApi';
import { ApiPlayerStudentProof } from '@/types/api/entities';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new PlayerStudentProofsApiService();

/** Review-only list: players upload proofs, managers approve or reject. No add. */
export default function PlayerStudentProofsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getProofs(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/player-student-proofs/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiPlayerStudentProof>({
    resourceName: 'PlayerStudentProof',
    resourceDisplayName: 'Student proof',
    sectionLabel: 'Student proofs',
    sectionHref: '/player-student-proofs',
    fetchData,
    title: 'Student proofs',
    description: 'Review student proof uploads',
    onView: handleView,
    enableBulkDelete: false,
    enableBulkExport: false,
  });

  return <ResourceListPage config={config} />;
}
