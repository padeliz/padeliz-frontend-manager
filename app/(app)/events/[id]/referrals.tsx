/**
 * Event Referrals tab — settings + analytics lists.
 */

import EventReferralPanel from '@/components/events/EventReferralPanel';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function EventReferralsRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = Number(params.id);

  if (!Number.isFinite(eventId)) {
    return null;
  }

  return (
    <View className="flex-1">
      <EventReferralPanel eventId={eventId} />
    </View>
  );
}
