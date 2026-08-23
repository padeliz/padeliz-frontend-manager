import EditionParticipationsTab from '@/components/editions/EditionParticipationsTab';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { EditionParticipationsApiService } from '@/services/api/editionParticipationsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import { PlayerCustomFieldsApiService } from '@/services/api/playerCustomFieldsApi';
import { ApiEditionParticipationSummary } from '@/types/api/entities';
import { parseEditionDivisionId } from '@/utils/editionWorkspace';
import { fetchAllPaginated } from '@/utils/fetchAllPaginated';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const editionsApi = new EditionsApiService();
const editionDivisionsApi = new EditionDivisionsApiService();
const participationsApi = new EditionParticipationsApiService();
const playerCustomFieldsApi = new PlayerCustomFieldsApiService();

type ParticipationsQueryData = {
  participations: Awaited<
    ReturnType<EditionParticipationsApiService['getParticipations']>
  >['data'];
  editionSummary?: ApiEditionParticipationSummary;
};

export default function EditionParticipationsRoute() {
  const params = useLocalSearchParams<{ id: string; ed?: string }>();
  const editionId = Number(params.id);
  const [selectedCustomFieldIds, setSelectedCustomFieldIds] = useState<
    number[]
  >([]);

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

  const customFieldsQuery = useQuery({
    queryKey: ['playerCustomFields', 'active'],
    queryFn: async () => {
      const res = await playerCustomFieldsApi.getPlayerCustomFields({
        per_page: 100,
        sort_by: { sort_order: 'asc' },
      });
      return (res.data || []).filter(f => !f.archived_at);
    },
  });

  const customFieldOptions = useMemo(
    () =>
      (customFieldsQuery.data || []).map(f => ({
        label: f.label,
        value: f.id_player_custom_field,
      })),
    [customFieldsQuery.data]
  );

  const participationsQuery = useQuery({
    queryKey: [
      'editionParticipations',
      editionId,
      [...selectedCustomFieldIds].sort((a, b) => a - b).join(','),
    ],
    queryFn: async (): Promise<ParticipationsQueryData> => {
      const { data, meta } = await fetchAllPaginated(async page => {
        const res = await participationsApi.getParticipations({
          page,
          per_page: 100,
          filters: { edition_id: editionId },
          sort_by: { sort_order: 'asc' },
          custom_field_ids:
            selectedCustomFieldIds.length > 0
              ? selectedCustomFieldIds
              : undefined,
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
          customFieldOptions={customFieldOptions}
          selectedCustomFieldIds={selectedCustomFieldIds}
          onCustomFieldSelectionChange={setSelectedCustomFieldIds}
          onRefresh={async () => {
            await divisionsQuery.refetch();
            await participationsQuery.refetch();
          }}
        />
      </View>
    </GestureHandlerRootView>
  );
}
