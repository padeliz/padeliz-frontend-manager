import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EventLotteryPrizesApiService } from '@/services/api/eventLotteryPrizesApi';
import { ApiEventLotteryPrize } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventLotteryPrizesApiService();

export default function ViewEventLotteryPrizePage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getLotteryPrize(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEventLotteryPrize>) => {
      return api.updateLotteryPrize(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEventLotteryPrize>({
    resourceName: 'EventLotteryPrize',
    resourceDisplayName: 'Lottery Prize',
    sectionLabel: 'Lottery Prizes',
    sectionHref: '/event-lottery-prizes',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
