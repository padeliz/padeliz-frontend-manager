import EditionDivisionsTab from '@/components/editions/EditionDivisionsTab';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { EditionParticipationsApiService } from '@/services/api/editionParticipationsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import { parseEditionDivisionId } from '@/utils/editionWorkspace';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const editionsApi = new EditionsApiService();
const editionDivisionsApi = new EditionDivisionsApiService();
const participationsApi = new EditionParticipationsApiService();

export default function EditionDivisionsRoute() {
  const params = useLocalSearchParams<{ id: string; ed?: string }>();
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
      });
      return res.data || [];
    },
    enabled: Number.isFinite(editionId),
  });

  const participationsQuery = useQuery({
    queryKey: ['editionParticipations', editionId],
    queryFn: async () => {
      const res = await participationsApi.getParticipations({
        per_page: 500,
        filters: { edition_id: editionId },
        sort_by: { sort_order: 'asc' },
      });
      return res.data || [];
    },
    enabled: Number.isFinite(editionId),
  });

  const divisions = divisionsQuery.data || [];
  const selectedDivisionId = parseEditionDivisionId(
    params.ed,
    divisions.map(d => d.id_edition_division)
  );
  const editionFinalized = !!editionQuery.data?.finalized_at;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="p-4">
        <EditionDivisionsTab
          editionId={editionId}
          editionFinalized={editionFinalized}
          divisions={divisions}
          participations={participationsQuery.data || []}
          selectedDivisionId={selectedDivisionId}
          onRefresh={async () => {
            await divisionsQuery.refetch();
            await participationsQuery.refetch();
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}
