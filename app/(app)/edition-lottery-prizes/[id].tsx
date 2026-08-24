import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EditionLotteryPrizesApiService } from '@/services/api/editionLotteryPrizesApi';
import { ApiEditionLotteryPrize } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionLotteryPrizesApiService();

export default function ViewEditionLotteryPrizePage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getLotteryPrize(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEditionLotteryPrize>) => {
      return api.updateLotteryPrize(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEditionLotteryPrize>({
    resourceName: 'EditionLotteryPrize',
    resourceDisplayName: 'Lottery Prize',
    sectionLabel: 'Lottery Prizes',
    sectionHref: '/edition-lottery-prizes',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
