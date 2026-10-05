import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EventLotteriesApiService } from '@/services/api/eventLotteriesApi';
import { ApiEventLottery } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventLotteriesApiService();

export default function ViewEventLotteryPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getLottery(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEventLottery>) => {
      return api.updateLottery(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEventLottery>({
    resourceName: 'EventLottery',
    resourceDisplayName: 'Lottery',
    sectionLabel: 'Lotteries',
    sectionHref: '/event-lotteries',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
