import DivisionLevelBandsPicker from '@/components/divisions/DivisionLevelBandsPicker';
import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { ApiDivision } from '@/types/api/entities';
import React, { useCallback, useRef, useState } from 'react';

const api = new DivisionsApiService();

export default function AddDivisionPage() {
  // Bands (M2M) travel as level_ids; level_min / level_max are plain form
  // fields and are never derived from the selected bands.
  const [levelIds, setLevelIds] = useState<number[]>([]);
  const levelIdsRef = useRef<number[]>([]);
  levelIdsRef.current = levelIds;

  const createResource = useCallback(async (data: Partial<ApiDivision>) => {
    return api.createDivision({ ...data, level_ids: levelIdsRef.current });
  }, []);

  const config = useResourceCreatePageConfig<ApiDivision>({
    resourceName: 'Division',
    resourceDisplayName: 'Division',
    sectionLabel: 'Divisions',
    sectionHref: '/divisions',
    createResource,
    getViewPath: id => '/divisions/' + id,
    formExtras: (
      <DivisionLevelBandsPicker
        selectedIds={levelIds}
        onChange={setLevelIds}
      />
    ),
  });

  return <ResourceCreatePage config={config} />;
}
