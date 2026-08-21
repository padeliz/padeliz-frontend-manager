import PlayerCustomFieldsPanel from '@/components/players/PlayerCustomFieldsPanel';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function PlayerCustomFieldsPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const playerId = Number(params.id);

  if (!playerId || Number.isNaN(playerId)) {
    return null;
  }

  return <PlayerCustomFieldsPanel playerId={playerId} />;
}
