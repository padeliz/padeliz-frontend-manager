import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { BenefitEntitlementsApiService } from '@/services/api/benefitEntitlementsApi';
import { ApiBenefitEntitlement } from '@/types/api/entities';
import { UiDataTableColumn } from '@/types/ui/tables';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Text } from 'react-native';

const api = new BenefitEntitlementsApiService();

function formatTs(ts?: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

export default function BenefitEntitlementsPage() {
  const router = useRouter();

  const fetchData = useCallback(async (params: any) => {
    const response = await api.getEntitlements(params);
    return {
      data: response.data,
      meta: response.meta,
      links: (response as any).links,
    };
  }, []);

  const handleAdd = useCallback(() => {
    router.push('/benefit-entitlements/add' as any);
  }, [router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/benefit-entitlements/${id}` as any);
    },
    [router]
  );

  const staticColumns: UiDataTableColumn<ApiBenefitEntitlement>[] = useMemo(
    () => [
      {
        key: 'id_entitlement',
        label: 'ID',
        sortable: true,
        width: 80,
        render: (item: ApiBenefitEntitlement) => (
          <Text className="text-gray-900 text-sm">#{item.id_entitlement}</Text>
        ),
      },
      {
        key: 'benefit_definition_id',
        label: 'Benefit',
        sortable: true,
        width: 180,
        render: (item: ApiBenefitEntitlement) => (
          <Text className="text-gray-700 text-sm">
            {item.benefit_definition?.name ||
              `Benefit #${item.benefit_definition_id}`}
          </Text>
        ),
      },
      {
        key: 'player_id',
        label: 'Player',
        sortable: true,
        width: 180,
        render: (item: ApiBenefitEntitlement) => (
          <Text className="text-gray-700 text-sm">
            {item.player?.name || `Player #${item.player_id}`}
          </Text>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        width: 100,
        render: (item: ApiBenefitEntitlement) => (
          <Text className="text-gray-700 text-sm">
            {String(item.status).replace(/_/g, ' ')}
          </Text>
        ),
      },
      {
        key: 'remaining_uses',
        label: 'Uses left',
        sortable: true,
        width: 90,
        render: (item: ApiBenefitEntitlement) => (
          <Text className="text-gray-700 text-sm">
            {item.remaining_uses ?? '—'}
          </Text>
        ),
      },
      {
        key: 'valid_until',
        label: 'Valid until',
        sortable: true,
        width: 160,
        render: (item: ApiBenefitEntitlement) => (
          <Text className="text-gray-700 text-sm">
            {formatTs(item.valid_until)}
          </Text>
        ),
      },
    ],
    []
  );

  const config = useResourcePageConfig<ApiBenefitEntitlement>({
    resourceName: 'BenefitEntitlement',
    resourceDisplayName: 'Entitlement',
    sectionLabel: 'Entitlements',
    sectionHref: '/benefit-entitlements',
    fetchData,
    staticColumns,
    primaryKeyField: 'id_entitlement',
    title: 'Benefit entitlements',
    description: 'Granted player benefit entitlements',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: false,
    enableBulkExport: true,
  });

  return <ResourceListPage config={config} />;
}
