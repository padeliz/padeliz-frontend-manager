import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { useResourceViewPageConfig } from '@/hooks/useResourceViewPageConfig';
import { EventLotteryRulesApiService } from '@/services/api/eventLotteryRulesApi';
import { ApiEventLotteryRule } from '@/types/api/event';
import React, { useCallback } from 'react';

const api = new EventLotteryRulesApiService();

export default function ViewEventLotteryRulePage() {
  const fetchResource = useCallback(async (id: string | number) => {
    return api.getRule(Number(id));
  }, []);

  const updateResource = useCallback(
    async (id: string | number, data: Partial<ApiEventLotteryRule>) => {
      return api.updateRule(Number(id), data);
    },
    []
  );

  const config = useResourceViewPageConfig<ApiEventLotteryRule>({
    resourceName: 'EventLotteryRule',
    resourceDisplayName: 'Lottery Rule',
    sectionLabel: 'Lottery Rules',
    sectionHref: '/event-lottery-rules',
    fetchResource,
    updateResource,
  });

  return <ResourceViewPage config={config} />;
}
