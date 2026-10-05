import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EventLotteryRulesApiService } from '@/services/api/eventLotteryRulesApi';
import { ApiEventLotteryRule } from '@/types/api/event';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new EventLotteryRulesApiService();

export default function EventLotteryRulesPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getRules(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return api.bulkDeleteRules(ids as number[]);
  }, []);


  const handleAdd = useCallback(() => {
    router.push('/event-lottery-rules/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/event-lottery-rules/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEventLotteryRule>({
    resourceName: 'EventLotteryRule',
    resourceDisplayName: 'Lottery Rule',
    sectionLabel: 'Lottery Rules',
    sectionHref: '/event-lottery-rules',
    fetchData,
    bulkDelete,
    title: 'Lottery Rules',
    description: 'Manage lottery eligibility rules',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
