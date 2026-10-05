/**
 * Dashboard
 * Main screen after authentication
 */

import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/managerAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const quickActions = [
    {
      title: 'Manage Clubs',
      description: 'Add, edit, or remove padel clubs',
      icon: 'business',
      href: '/clubs',
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Divisions',
      description: 'Configure player skill divisions',
      icon: 'layers',
      href: '/divisions',
      color: 'bg-green-500',
    },
    {
      title: 'Manage Events',
      description: 'Create and manage tournament events',
      icon: 'calendar',
      href: '/events',
      color: 'bg-purple-500',
    },
    {
      title: 'Manage Players',
      description: 'Add and manage player accounts',
      icon: 'people',
      href: '/players',
      color: 'bg-orange-500',
    },
    {
      title: 'Manage Locations',
      description: 'Configure court locations',
      icon: 'location',
      href: '/locations',
      color: 'bg-red-500',
    },
    {
      title: 'Manage Prizes',
      description: 'Set up tournament prizes',
      icon: 'trophy',
      href: '/prizes',
      color: 'bg-yellow-500',
    },
  ];

  const handleQuickAction = (href: string) => {
    if (href === '/clubs') {
      router.push('/clubs' as any);
    } else {
    }
  };

  return (
    <AppLayout title="Dashboard">
      {/* Welcome Section */}
      <View className="mb-8">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}!
        </Text>
        <Text className="text-gray-600">
          Manage your padel tournaments, clubs, and players from this central
          dashboard.
        </Text>
      </View>

      {/* Quick Actions Grid */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </Text>
        <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map(action => (
            <Pressable
              key={action.href}
              onPress={() => handleQuickAction(action.href)}
              className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <View className="flex-row items-start">
                <View className={`p-3 rounded-lg ${action.color} mr-4`}>
                  <Ionicons name={action.icon as any} size={24} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 mb-2">
                    {action.title}
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    {action.description}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Stats Overview */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Overview
        </Text>
        <View className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <View className="bg-white p-6 rounded-lg border border-gray-200">
            <Text className="text-2xl font-bold text-blue-600 mb-1">5</Text>
            <Text className="text-gray-600">Active Clubs</Text>
          </View>
          <View className="bg-white p-6 rounded-lg border border-gray-200">
            <Text className="text-2xl font-bold text-green-600 mb-1">3</Text>
            <Text className="text-gray-600">Divisions</Text>
          </View>
          <View className="bg-white p-6 rounded-lg border border-gray-200">
            <Text className="text-2xl font-bold text-purple-600 mb-1">2</Text>
            <Text className="text-gray-600">Events</Text>
          </View>
          <View className="bg-white p-6 rounded-lg border border-gray-200">
            <Text className="text-2xl font-bold text-orange-600 mb-1">25</Text>
            <Text className="text-gray-600">Players</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View>
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </Text>
        <View className="bg-white rounded-lg border border-gray-200">
          <View className="p-4 border-b border-gray-200">
            <Text className="text-sm text-gray-500">No recent activity</Text>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}
