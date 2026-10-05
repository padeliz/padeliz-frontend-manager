import { AuthGuard } from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ManagerAuthProvider } from '@/context/managerAuth';
import { ToastProvider } from '@/context/ToastContext';
import { createManagerQueryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

export default function RootLayout() {
  const [queryClient] = useState(() => createManagerQueryClient());

  return (
    <GestureHandlerRootView style={{ flex: 1 }} testID="app-gesture-root">
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ManagerAuthProvider>
              <AuthGuard>
                <StatusBar style="auto" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen
                    name="(app)"
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="lottery-live/[eventId]"
                    options={{
                      headerShown: false,
                    }}
                  />
                </Stack>
              </AuthGuard>
            </ManagerAuthProvider>
          </ToastProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
