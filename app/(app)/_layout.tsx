/**
 * Main App Layout
 * Contains all authenticated screens
 */

import { AuthGuard } from '@/components/AuthGuard';
import { BreadcrumbProvider } from '@/components/layout/BreadcrumbProvider';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <AuthGuard>
      <BreadcrumbProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </BreadcrumbProvider>
    </AuthGuard>
  );
}
