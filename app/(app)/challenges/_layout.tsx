import { Stack } from 'expo-router';
import React from 'react';

export default function ChallengesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(hub)" />
      <Stack.Screen name="kotc/[sessionId]" />
      <Stack.Screen name="smash/[sessionId]" />
    </Stack>
  );
}
