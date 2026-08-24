import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EditionLuckyOnesApiService } from '@/services/api/editionLuckyOnesApi';
import { ApiEditionLuckyOne } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionLuckyOnesApiService();

export default function ViewEditionLotteryLuckyPage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getLuckyOne(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEditionLuckyOne>) => {
      return api.updateLuckyOne(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEditionLuckyOne>({
    resourceName: 'EditionLotteryLucky',
    resourceDisplayName: 'Lottery Lucky',
    sectionLabel: 'Lucky Ones',
    sectionHref: '/edition-lottery-luckies',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
