import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EditionLotteryRulesApiService } from '@/services/api/editionLotteryRulesApi';
import { ApiEditionLotteryRule } from '@/types/api/edition';
import React, { useCallback } from 'react';

const api = new EditionLotteryRulesApiService();

export default function AddEditionLotteryRulePage() {
  const createResource = useCallback(async (data: Partial<ApiEditionLotteryRule>) => {
    return api.createRule(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEditionLotteryRule>({
    resourceName: 'EditionLotteryRule',
    resourceDisplayName: 'Lottery Rule',
    createResource,
    getViewPath: id => '/edition-lottery-rules/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
