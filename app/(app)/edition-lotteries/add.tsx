import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EditionLotteriesApiService } from '@/services/api/editionLotteriesApi';
import { ApiEditionLottery } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionLotteriesApiService();

export default function AddEditionLotteryPage() {
  const createResource = useCallback(async (data: Partial<ApiEditionLottery>) => {
    return api.createLottery(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEditionLottery>({
    resourceName: 'EditionLottery',
    resourceDisplayName: 'Lottery',
    createResource,
    getViewPath: id => '/edition-lotteries/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
