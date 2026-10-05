import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EventLuckyOnesApiService } from '@/services/api/eventLuckyOnesApi';
import { ApiEventLuckyOne } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventLuckyOnesApiService();

export default function AddEventLotteryLuckyPage() {
  const createResource = useCallback(async (data: Partial<ApiEventLuckyOne>) => {
    return api.createLuckyOne(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEventLuckyOne>({
    resourceName: 'EventLotteryLucky',
    resourceDisplayName: 'Lottery Lucky',
    sectionLabel: 'Lucky Ones',
    sectionHref: '/event-lottery-luckies',
    createResource,
    getViewPath: id => '/event-lottery-luckies/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
