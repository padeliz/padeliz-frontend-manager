import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EventLuckyOnesApiService } from '@/services/api/eventLuckyOnesApi';
import { ApiEventLuckyOne } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EventLuckyOnesApiService();

export default function ViewEventLotteryLuckyPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getLuckyOne(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEventLuckyOne>) => {
      return api.updateLuckyOne(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEventLuckyOne>({
    resourceName: 'EventLotteryLucky',
    resourceDisplayName: 'Lottery Lucky',
    sectionLabel: 'Lucky Ones',
    sectionHref: '/event-lottery-luckies',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
