import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import StudentProofReview from '@/components/playerLevels/StudentProofReview';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

export default function ViewPlayerStudentProofPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = parseInt(String(params.id), 10);

  const breadcrumbs = useMemo(
    () =>
      buildResourceBreadcrumbs({
        sectionLabel: 'Student proofs',
        sectionHref: '/player-student-proofs',
        leaf: Number.isFinite(id) ? `#${id}` : 'Proof',
      }),
    [id]
  );
  useBreadcrumbSegments(`player-student-proof-${id}`, breadcrumbs);

  return (
    <AppLayout
      title={`Student proof #${Number.isFinite(id) ? id : ''}`.trim()}
      description="Review a student proof upload"
    >
      {Number.isFinite(id) && id > 0 ? (
        <StudentProofReview proofId={id} />
      ) : (
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-gray-800">Student proof not found</Text>
        </View>
      )}
    </AppLayout>
  );
}
