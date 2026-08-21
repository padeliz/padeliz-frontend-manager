import EditionDivisionsTab from '@/components/editions/EditionDivisionsTab';
import { queryKeys } from '@/lib/queryClient';
import { DivisionsApiService } from '@/services/api/divisionsApi';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const editionsApi = new EditionsApiService();
const editionDivisionsApi = new EditionDivisionsApiService();
const divisionsApi = new DivisionsApiService();

export default function EditionDivisionsRoute() {
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

  const divisionsQuery = useQuery({
    queryKey: queryKeys.editionDivisions(editionId),
    queryFn: async () => {
      const res = await editionDivisionsApi.getEditionDivisions({
        per_page: 100,
        filters: { edition_id: editionId },
        sort_by: { skill_order: 'asc' },
      });
      return res.data || [];
    },
    enabled: Number.isFinite(editionId),
  });

  const catalogQuery = useQuery({
    queryKey: ['divisionsCatalog'],
    queryFn: async () => {
      const res = await divisionsApi.getDivisions({ per_page: 100 });
      return res.data || [];
    },
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="p-4">
        <EditionDivisionsTab
          editionId={editionId}
          editionFinalized={!!editionQuery.data?.finalized_at}
          divisions={divisionsQuery.data || []}
          catalogDivisions={catalogQuery.data || []}
          onRefresh={async () => {
            await divisionsQuery.refetch();
            await catalogQuery.refetch();
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}
