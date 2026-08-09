/**
 * Add Player Page
 * Form to create a new player
 */

import AppLayout from '@/components/layout/AppLayout';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

export default function AddPlayerPage() {
  const router = useRouter();

  return (
    <AppLayout title="Add Player">
      <View className="flex-1 p-4">
        <Text className="text-lg font-semibold mb-4">Add New Player</Text>
        <Text className="text-gray-600">
          Player creation form will be implemented here.
        </Text>
      </View>
    </AppLayout>
  );
}
