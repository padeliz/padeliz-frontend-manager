import EditionScoresTab from '@/components/editions/EditionScoresTab';
import { parseEditionDivisionId } from '@/utils/editionWorkspace';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

const editionDivisionsApi = new EditionDivisionsApiService();

export default function ScoresRoute() {
  const params = useLocalSearchParams<{ id: string; ed?: string }>();
  const editionId = Number(params.id);
  const divisionsQuery = useQuery({
    queryKey: queryKeys.editionDivisions(editionId),
    queryFn: async () => {
      const res = await editionDivisionsApi.getEditionDivisions({
        per_page: 100,
        filters: { edition_id: editionId },
      });
      return res.data || [];
    },
  });
  const divisions = divisionsQuery.data || [];
  const edId = parseEditionDivisionId(
    params.ed,
    divisions.map(d => d.id_edition_division)
  );

  return (
    <View className="p-4">
      <EditionScoresTab editionDivisionId={edId} divisions={divisions} />
    </View>
  );
}
