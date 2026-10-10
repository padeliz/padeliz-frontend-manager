import DivisionLevelBandsSection from '@/components/divisions/DivisionLevelBandsSection';
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { ApiDivision } from '@/types/api/entities';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo } from 'react';

const api = new DivisionsApiService();

export default function ViewDivisionPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const divisionId = parseInt(String(params.id), 10);

  const fetchResource = useCallback(async (id: string | number) => {
    return api.getDivision(Number(id));
  }, []);

  // Bounds (level_min / level_max) save with the main form; bands (level_ids)
  // save from their own section, so neither rewrites the other.
  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiDivision>) => {
      return api.updateDivision(Number(id), data);
    },
    []
  );

  const footer = useMemo(
    () =>
      Number.isFinite(divisionId) && divisionId > 0 ? (
        <DivisionLevelBandsSection divisionId={divisionId} />
      ) : null,
    [divisionId]
  );

  const config = useResourceViewPageConfig<ApiDivision>({
    resourceName: 'Division',
    resourceDisplayName: 'Division',
    sectionLabel: 'Divisions',
    sectionHref: '/divisions',
    fetchResource,
    updateResource,
    footer,
  });

  return <ResourceViewPage config={config} />;
}
