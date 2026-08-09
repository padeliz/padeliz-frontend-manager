import AppLayout from '@/components/layout/AppLayout';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function ClubsListScreen() {
  const router = useRouter();

  const breadcrumbs = [{ label: 'Dashboard', href: '/' }, { label: 'Clubs' }];

  const handleAddClub = () => {
    // For now, just show a message since the route doesn't exist yet
  };

  const handleViewClub = (id: number) => {
    // For now, just show a message since the route doesn't exist yet
  };

  // Header actions for the AppLayout
  const headerActions = (
    <Pressable
      onPress={handleAddClub}
      className="bg-blue-600 px-4 py-2 rounded-lg flex-row items-center"
    >
      <Ionicons name="add" size={20} color="white" />
      <Text className="text-white font-semibold ml-2">Add Club</Text>
    </Pressable>
  );

  // Mock data for demonstration
  const mockClubs = [
    { id: 1, name: 'Padel Club Barcelona', city: 'Barcelona', courts: 8 },
    { id: 2, name: 'Madrid Padel Center', city: 'Madrid', courts: 12 },
    { id: 3, name: 'Valencia Padel Club', city: 'Valencia', courts: 6 },
    { id: 4, name: 'Sevilla Padel Arena', city: 'Sevilla', courts: 10 },
    { id: 5, name: 'Bilbao Padel Club', city: 'Bilbao', courts: 4 },
  ];

  return (
    <AppLayout
      title="Clubs Management"
      breadcrumbs={breadcrumbs}
      headerActions={headerActions}
    >
      {/* Search and Filters - Coming in Phase 4 */}
      <View className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
        <Text className="text-sm text-gray-500 mb-2">
          Search and filters coming in Phase 4
        </Text>
        <View className="h-10 bg-gray-100 rounded-lg items-center justify-center">
          <Text className="text-gray-400">🔍 Search clubs...</Text>
        </View>
      </View>

      {/* Clubs Grid */}
      <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockClubs.map(club => (
          <View
            key={club.id}
            className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300"
          >
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900 mb-1">
                  {club.name}
                </Text>
                <Text className="text-gray-600">{club.city}</Text>
              </View>
              <View className="bg-blue-100 px-2 py-1 rounded">
                <Text className="text-blue-800 text-sm font-medium">
                  {club.courts} courts
                </Text>
              </View>
            </View>

            <View className="flex-row space-x-2">
              <Pressable
                onPress={() => handleViewClub(club.id)}
                className="flex-1 bg-blue-50 border border-blue-200 py-2 rounded-lg items-center"
              >
                <Text className="text-blue-700 font-medium">View</Text>
              </Pressable>
              <Pressable className="flex-1 bg-gray-50 border border-gray-200 py-2 rounded-lg items-center">
                <Text className="text-gray-700 font-medium">Edit</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {/* Pagination Placeholder */}
      <View className="mt-8 bg-white p-4 rounded-lg border border-gray-200">
        <Text className="text-sm text-gray-500 text-center">
          Pagination controls coming in Phase 4
        </Text>
      </View>
    </AppLayout>
  );
}
