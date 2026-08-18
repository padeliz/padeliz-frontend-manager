import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EditionLotteryPrizesApiService } from '@/services/api/editionLotteryPrizesApi';
import { ApiEditionLotteryPrize } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionLotteryPrizesApiService();

export default function AddEditionLotteryPrizePage() {
  const createResource = useCallback(
    async (data: Partial<ApiEditionLotteryPrize>) => {
      return api.createLotteryPrize(data);
    },
    []
  );

  const config = useResourceCreatePageConfig<ApiEditionLotteryPrize>({
    resourceName: 'EditionLotteryPrize',
    resourceDisplayName: 'Lottery Prize',
    createResource,
    getViewPath: id => '/edition-lottery-prizes/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
