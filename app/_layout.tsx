import { AuthGuard } from '@/components/AuthGuard';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ManagerAuthProvider } from '@/context/managerAuth';
import { ToastProvider } from '@/context/ToastContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

export default function RootLayout() {
  return (
    <ErrorBoundary>
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
            </Stack>
          </AuthGuard>
        </ManagerAuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
