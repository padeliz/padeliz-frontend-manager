/**
 * Main App Layout
 * Contains all authenticated screens
 */

import { AuthGuard } from '@/components/AuthGuard';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="clubs" />
        <Stack.Screen name="players" />
      </Stack>
    </AuthGuard>
  );
}
