import { ApiReviewStatus } from '@/types/api/entities';
import React from 'react';
import { Text, View } from 'react-native';

const STYLES: Record<string, { box: string; text: string }> = {
  pending: { box: 'bg-amber-100', text: 'text-amber-800' },
  approved: { box: 'bg-green-100', text: 'text-green-800' },
  rejected: { box: 'bg-red-100', text: 'text-red-800' },
  discarded: { box: 'bg-gray-100', text: 'text-gray-700' },
};

export default function ReviewStatusBadge({
  status,
  testID = 'review-status-badge',
}: {
  status: ApiReviewStatus | string;
  testID?: string;
}) {
  const style = STYLES[status] ?? STYLES.discarded;
  return (
    <View testID={testID} className={`self-start rounded px-2 py-1 ${style.box}`}>
      <Text className={`text-xs font-medium ${style.text}`}>{status}</Text>
    </View>
  );
}
