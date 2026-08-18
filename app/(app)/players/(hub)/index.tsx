import { Redirect } from 'expo-router';
import React from 'react';

export default function PlayersHubIndex() {
  return <Redirect href={'/players/list' as any} />;
}
