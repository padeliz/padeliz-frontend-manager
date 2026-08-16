import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { EditionLotteryRulesApiService } from '@/services/api/editionLotteryRulesApi';
import { ApiEditionLotteryRule } from '@/types/api/edition';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

const api = new EditionLotteryRulesApiService();

export default function EditionLotteryRulesPage() {
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
    router.push('/edition-lottery-rules/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/edition-lottery-rules/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEditionLotteryRule>({
    resourceName: 'EditionLotteryRule',
    resourceDisplayName: 'Lottery Rule',
    fetchData,
    bulkDelete,
    title: 'Edition Lottery Rules',
    description: 'Manage lottery eligibility rules',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
