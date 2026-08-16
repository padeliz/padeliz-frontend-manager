import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EditionLotteriesApiService } from '@/services/api/editionLotteriesApi';
import { ApiEditionLottery } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionLotteriesApiService();

export default function ViewEditionLotteryPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getLottery(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEditionLottery>) => {
      return api.updateLottery(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEditionLottery>({
    resourceName: 'EditionLottery',
    resourceDisplayName: 'Lottery',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
