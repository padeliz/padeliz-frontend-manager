import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EventLotteriesApiService } from '@/services/api/eventLotteriesApi';
import { ApiEventLottery } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventLotteriesApiService();

export default function AddEventLotteryPage() {
  const createResource = useCallback(async (data: Partial<ApiEventLottery>) => {
    return api.createLottery(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEventLottery>({
    resourceName: 'EventLottery',
    resourceDisplayName: 'Lottery',
    sectionLabel: 'Lotteries',
    sectionHref: '/event-lotteries',
    createResource,
    getViewPath: id => '/event-lotteries/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
