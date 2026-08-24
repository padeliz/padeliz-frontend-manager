import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EditionLuckyOnesApiService } from '@/services/api/editionLuckyOnesApi';
import { ApiEditionLuckyOne } from '@/types/api/entities';
import React, { useCallback } from 'react';

const api = new EditionLuckyOnesApiService();

export default function AddEditionLotteryLuckyPage() {
  const createResource = useCallback(async (data: Partial<ApiEditionLuckyOne>) => {
    return api.createLuckyOne(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEditionLuckyOne>({
    resourceName: 'EditionLotteryLucky',
    resourceDisplayName: 'Lottery Lucky',
    sectionLabel: 'Lucky Ones',
    sectionHref: '/edition-lottery-luckies',
    createResource,
    getViewPath: id => '/edition-lottery-luckies/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
