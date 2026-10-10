import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import PlayerLevelAssessmentReview from '@/components/playerLevels/PlayerLevelAssessmentReview';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

export default function ViewPlayerLevelAssessmentPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(String(params.id), 10);

  const breadcrumbs = useMemo(
    () =>
      buildResourceBreadcrumbs({
        sectionLabel: 'Level assessments',
        sectionHref: '/player-level-assessments',
        leaf: Number.isFinite(id) ? `#${id}` : 'Assessment',
      }),
    [id]
  );
  useBreadcrumbSegments(`player-level-assessment-${id}`, breadcrumbs);

  return (
    <AppLayout
      title={`Level assessment #${Number.isFinite(id) ? id : ''}`.trim()}
      description="Review a player's level assessment"
    >
      {Number.isFinite(id) && id > 0 ? (
        <PlayerLevelAssessmentReview assessmentId={id} />
      ) : (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-gray-800">Assessment not found</Text>
        </View>
      )}
    </AppLayout>
  );
}
