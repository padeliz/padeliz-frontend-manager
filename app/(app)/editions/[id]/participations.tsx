import EditionParticipationsTab from '@/components/editions/EditionParticipationsTab';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { EditionParticipationsApiService } from '@/services/api/editionParticipationsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import { ApiEditionParticipationSummary } from '@/types/api/entities';
import { parseEditionDivisionId } from '@/utils/editionWorkspace';
import { fetchAllPaginated } from '@/utils/fetchAllPaginated';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const editionsApi = new EditionsApiService();
const editionDivisionsApi = new EditionDivisionsApiService();
const participationsApi = new EditionParticipationsApiService();

type ParticipationsQueryData = {
  participations: Awaited<
    ReturnType<EditionParticipationsApiService['getParticipations']>
  >['data'];
  editionSummary?: ApiEditionParticipationSummary;
};

export default function EditionParticipationsRoute() {
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
    queryFn: async (): Promise<ParticipationsQueryData> => {
      const { data, meta } = await fetchAllPaginated(async page => {
        const res = await participationsApi.getParticipations({
          page,
          per_page: 100,
          filters: { edition_id: editionId },
          sort_by: { sort_order: 'asc' },
        });
        return { data: res.data || [], meta: res.meta };
      });

      return {
        participations: data,
        editionSummary: meta?.edition_summary as
          | ApiEditionParticipationSummary
          | undefined,
      };
    },
    enabled: Number.isFinite(editionId),
  });

  const divisions = divisionsQuery.data || [];
  const selectedDivisionId = parseEditionDivisionId(
    params.ed,
    divisions.map(d => d.id_edition_division)
  );
  const editionFinalized = !!editionQuery.data?.finalized_at;
  const editionSummary = participationsQuery.data?.editionSummary;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="p-4">
        <EditionParticipationsTab
          editionId={editionId}
          editionFinalized={editionFinalized}
          divisions={divisions}
          participations={participationsQuery.data?.participations || []}
          selectedDivisionId={selectedDivisionId}
          registeredNotParticipatingCount={
            editionSummary?.registered_not_participating_count ?? 0
          }
          participationsLocked={editionSummary?.participations_locked ?? false}
          onRefresh={async () => {
            await divisionsQuery.refetch();
            await participationsQuery.refetch();
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}
