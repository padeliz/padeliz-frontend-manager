import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { BenefitsApiService } from '@/services/api/benefitsApi';
import { ApiBenefitDefinition } from '@/types/api/entities';
import { UiDataTableColumn } from '@/types/ui/tables';
import { formatBenefitEffect } from '@/utils/benefitForm';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Text } from 'react-native';

const api = new BenefitsApiService();

export default function BenefitsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getBenefits(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/benefits/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/benefits/${id}` as any);
    },
    [router]
  );

  const staticColumns: UiDataTableColumn<ApiBenefitDefinition>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        width: 200,
        render: (item: ApiBenefitDefinition) => (
          <Text className="text-gray-900 text-sm">{item.name}</Text>
        ),
      },
      {
        key: 'slug',
        label: 'Slug',
        sortable: true,
        width: 140,
        render: (item: ApiBenefitDefinition) => (
          <Text className="text-gray-700 text-sm">{item.slug}</Text>
        ),
      },
      {
        key: 'amount_value',
        label: 'Effect',
        sortable: true,
        width: 100,
        render: (item: ApiBenefitDefinition) => (
          <Text className="text-gray-700 text-sm">
            {formatBenefitEffect(item)}
          </Text>
        ),
      },
      {
        key: 'scope_type',
        label: 'Scope',
        sortable: true,
        width: 110,
        render: (item: ApiBenefitDefinition) => (
          <Text className="text-gray-700 text-sm">
            {String(item.scope_type).replace(/_/g, ' ')}
          </Text>
        ),
      },
      {
        key: 'exclusivity',
        label: 'Stacking',
        sortable: true,
        width: 140,
        render: (item: ApiBenefitDefinition) => (
          <Text className="text-gray-700 text-sm">
            {String(item.exclusivity).replace(/_/g, ' ')}
          </Text>
        ),
      },
      {
        key: 'is_active',
        label: 'Active',
        sortable: true,
        width: 80,
        render: (item: ApiBenefitDefinition) => (
          <Text
            className={`text-sm ${item.is_active ? 'text-green-700' : 'text-gray-500'}`}
          >
            {item.is_active ? 'Yes' : 'No'}
          </Text>
        ),
      },
      {
        key: 'priority',
        label: 'Priority',
        sortable: true,
        width: 90,
        render: (item: ApiBenefitDefinition) => (
          <Text className="text-gray-700 text-sm">{item.priority ?? '—'}</Text>
        ),
      },
    ],
    []
  );

  const config = useResourcePageConfig<ApiBenefitDefinition>({
    resourceName: 'BenefitDefinition',
    resourceDisplayName: 'Benefit',
    sectionLabel: 'Benefits',
    sectionHref: '/benefits',
    fetchData,
    staticColumns,
    primaryKeyField: 'id_benefit',
    title: 'Benefits',
    description: 'Catalog discounts and fee adjustments',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: false,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
