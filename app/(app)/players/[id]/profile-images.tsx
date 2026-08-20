import PlayerProfileImagesPanel from '@/components/players/PlayerProfileImagesPanel';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function PlayerProfileImagesPage() {
  const params = useLocalSearchParams<{ id: string }>();
  const playerId = Number(params.id);

  if (!playerId || Number.isNaN(playerId)) {
    return null;
  }

  return <PlayerProfileImagesPanel playerId={playerId} />;
}
