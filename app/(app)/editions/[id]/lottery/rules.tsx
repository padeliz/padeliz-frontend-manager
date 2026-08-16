import EditionLotteryTab from '@/components/editions/EditionLotteryTab';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import { parseEditionDivisionId } from '@/utils/editionWorkspace';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

const editionsApi = new EditionsApiService();
const editionDivisionsApi = new EditionDivisionsApiService();

export default function LotteryRulesRoute() {
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
  const divisions = divisionsQuery.data || [];
  const editionDivisionId = parseEditionDivisionId(
    params.ed,
    divisions.map(d => d.id_edition_division)
  );

  return (
    <View className="p-4">
      <EditionLotteryTab
        editionId={editionId}
        editionDivisionId={editionDivisionId}
        mode="rules"
        divisions={divisions}
        editionFinalized={!!editionQuery.data?.finalized_at}
      />
    </View>
  );
}
