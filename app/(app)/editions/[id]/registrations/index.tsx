import ResourceListPage from '@/components/pages/ResourceListPage';
import { useResourcePageConfig } from '@/hooks/useResourcePageConfig';
import { queryKeys } from '@/lib/queryClient';
import { EditionRegistrationsApiService } from '@/services/api/editionRegistrationsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import { ApiEditionRegistration } from '@/types/api/entities';
import { withSearchParams } from '@/utils/withSearchParams';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Text, View } from 'react-native';

const registrationsApi = new EditionRegistrationsApiService();
const editionsApi = new EditionsApiService();

export default function EditionRegistrationsTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const editionId = Number(params.id);

  const editionQuery = useQuery({
    queryKey: queryKeys.edition(editionId),
    queryFn: async () => {
      const res = await editionsApi.getEdition(editionId);
      return res.data;
    },
    enabled: Number.isFinite(editionId),
  });

  const mutationsDisabled = !!editionQuery.data?.finalized_at;

  const fetchData = useCallback(
    async (params: any) => {
      const response = await registrationsApi.getRegistrations({
        ...params,
        filters: { ...params?.filters, edition_id: editionId },
      });
      return {
        data: response.data,
        meta: response.meta,
        links: (response as any).links,
      };
    },
    [editionId]
  );

  const bulkDelete = useCallback(async (ids: (string | number)[]) => {
    return registrationsApi.bulkDeleteRegistrations(ids as number[]);
  }, []);

  const handleAdd = useCallback(() => {
    router.push(
      withSearchParams('/edition-registrations/add', {
        edition_id: editionId,
      }) as any
    );
  }, [editionId, router]);

  const handleView = useCallback(
    (id: number) => {
      router.push(`/edition-registrations/${id}` as any);
    },
    [router]
  );

  const config = useResourcePageConfig<ApiEditionRegistration>({
    resourceName: 'EditionRegistration',
    resourceDisplayName: 'Registration',
    fetchData,
    bulkDelete,
    excludeFields: ['edition_id'],
    title: 'Registrations',
    description: 'Registrations for this edition',
    onAdd: handleAdd,
    onView: handleView,
    enableBulkDelete: true,
    enableBulkExport: true,
    embedded: true,
    mutationsDisabled,
  });

  return (
    <View className="p-4 flex-1">
      {mutationsDisabled && (
        <Text
          testID="registrations-finalized-hint"
          className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3"
        >
          Edition is finalized — registrations cannot be added or deleted.
        </Text>
      )}
      <ResourceListPage config={config} />
    </View>
  );
}
