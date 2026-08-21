/**
 * Player detail chrome: Details | Profile Images tabs with back navigation.
 */

import EditionTabsBar from '@/components/editions/EditionTabsBar';
import AppLayout from '@/components/layout/AppLayout';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Slot, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

export function PlayerDetailChrome() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ id: string }>();
  const playerId = params.id;

  if (
    playerId &&
    (pathname === `/players/${playerId}` || pathname === `/players/${playerId}/`)
  ) {
    return <Redirect href={`/players/${playerId}/details` as any} />;
  }

  const tabs = useMemo(
    () => [
      {
        label: 'Details',
        href: `/players/${playerId}/details`,
        match: '/details',
      },
      {
        label: 'Profile Images',
        href: `/players/${playerId}/profile-images`,
        match: '/profile-images',
      },
      {
        label: 'Custom fields',
        href: `/players/${playerId}/custom-fields`,
        match: '/custom-fields',
      },
    ],
    [playerId]
  );

  return (
    <AppLayout title="Player">
      <View className="flex-1">
        <View className="flex-row items-center p-4 border-b border-gray-200 gap-2">
          <Pressable
            testID="player-detail-back"
            onPress={() => router.push('/players/list' as any)}
            className="mr-1 p-2"
          >
            <Ionicons name="arrow-back" size={24} color="#4b5563" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900 flex-1">
            Player #{playerId}
          </Text>
        </View>

        <EditionTabsBar tabs={tabs} />

        <View className="flex-1">
          <Slot />
        </View>
      </View>
    </AppLayout>
  );
}
