/**
 * Authentication Guard
 * Protects routes and redirects unauthenticated users
 */

import { useAuth } from '@/context/managerAuth';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // Don't redirect while checking auth

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated and not already on auth page
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Redirect to dashboard if authenticated and on auth page
      router.replace('/');
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Checking authentication...</Text>
      </View>
    );
  }

  return <>{children}</>;
}
