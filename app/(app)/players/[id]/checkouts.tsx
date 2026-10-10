import RegistrationQueueList from '@/components/registrations/RegistrationQueueList';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

/** Player > Checkouts tab: every checkout of this player (no queue triage). */
export default function PlayerCheckoutsPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const playerId = Number(params.id);

  if (!playerId || Number.isNaN(playerId)) {
    return null;
  }

  return <RegistrationQueueList playerId={playerId} />;
}
