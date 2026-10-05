import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EventLotteryPrizesApiService } from '@/services/api/eventLotteryPrizesApi';
import { ApiEventLotteryPrize } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventLotteryPrizesApiService();

export default function AddEventLotteryPrizePage() {
  const createResource = useCallback(
    async (data: Partial<ApiEventLotteryPrize>) => {
      return api.createLotteryPrize(data);
    },
    []
  );

  const config = useResourceCreatePageConfig<ApiEventLotteryPrize>({
    resourceName: 'EventLotteryPrize',
    resourceDisplayName: 'Lottery Prize',
    sectionLabel: 'Lottery Prizes',
    sectionHref: '/event-lottery-prizes',
    createResource,
    getViewPath: id => '/event-lottery-prizes/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
