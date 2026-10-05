import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { useResourceCreatePageConfig } from '@/hooks/useResourceCreatePageConfig';
import { EventLotteryRulesApiService } from '@/services/api/eventLotteryRulesApi';
import { ApiEventLotteryRule } from '@/types/api/event';
import React, { useCallback } from 'react';

const api = new EventLotteryRulesApiService();

export default function AddEventLotteryRulePage() {
  const createResource = useCallback(async (data: Partial<ApiEventLotteryRule>) => {
    return api.createRule(data);
  }, []);

  const config = useResourceCreatePageConfig<ApiEventLotteryRule>({
    resourceName: 'EventLotteryRule',
    resourceDisplayName: 'Lottery Rule',
    sectionLabel: 'Lottery Rules',
    sectionHref: '/event-lottery-rules',
    createResource,
    getViewPath: id => '/event-lottery-rules/' + id,
  });

  return <ResourceCreatePage config={config} />;
}
