import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EditionLotteryRulesApiService } from '@/services/api/editionLotteryRulesApi';
import { ApiEditionLotteryRule } from '@/types/api/edition';
import React, { useCallback } from 'react';

const api = new EditionLotteryRulesApiService();

export default function ViewEditionLotteryRulePage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getRule(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEditionLotteryRule>) => {
      return api.updateRule(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEditionLotteryRule>({
    resourceName: 'EditionLotteryRule',
    resourceDisplayName: 'Lottery Rule',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
