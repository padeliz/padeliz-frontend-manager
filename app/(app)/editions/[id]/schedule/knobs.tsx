import EditionScheduleTab from '@/components/editions/EditionScheduleTab';
import { parseEditionDivisionId } from '@/utils/editionWorkspace';
import { queryKeys } from '@/lib/queryClient';
import { EditionDivisionsApiService } from '@/services/api/editionDivisionsApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

const editionDivisionsApi = new EditionDivisionsApiService();
const editionsApi = new EditionsApiService();

function useScheduleRouteContext() {
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
  });
  const divisions = divisionsQuery.data || [];
  const edId = parseEditionDivisionId(
    params.ed,
    divisions.map(d => d.id_edition_division)
  );
  const locationId =
    (editionQuery.data as any)?.location_id ??
    (editionQuery.data as any)?.location?.id_location ??
    null;
  return { edId, locationId, divisions };
}

export default function ScheduleKnobsRoute() {
  const { edId, locationId, divisions } = useScheduleRouteContext();

  return (
    <View className="p-4">
      <EditionScheduleTab
        editionDivisionId={edId}
        locationId={locationId}
        section="knobs"
        divisions={divisions}
      />
    </View>
  );
}
