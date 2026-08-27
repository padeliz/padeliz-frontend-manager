import { Redirect } from 'expo-router';
import React from 'react';

export default function ChallengesHubIndex() {
  return <Redirect href={'/challenges/all' as any} />;
}
