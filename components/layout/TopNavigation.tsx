import { useAuth } from '@/context/managerAuth';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

interface TopNavigationProps {
  onMenuPress: () => void;
  user: any;
}

export default function TopNavigation({ onMenuPress, user }: TopNavigationProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <View className="bg-white border-b border-gray-200 px-4 py-3 relative z-[99999]">
      <View className="flex-row items-center justify-between">
        {/* Left side - Brand and Menu button */}
        <View className="flex-row items-center">
          {/* Mobile menu button */}
          <Pressable
            onPress={onMenuPress}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 mr-6"
          >
            <Ionicons name="menu" size={24} color="#374151" />
          </Pressable>

          {/* Brand - Always visible on left */}
          <Text className="text-xl font-bold text-blue-600">
            Padeliz Manager
          </Text>
        </View>

        {/* Right side - User menu */}
        <View className="relative">
          <Pressable
            onPress={() => setShowUserMenu(!showUserMenu)}
            className="flex-row items-center p-2 rounded-lg hover:bg-gray-100"
          >
            {/* User avatar */}
            {user?.profile_image_url ? (
              <Image
                source={{ uri: user.profile_image_url }}
                className="w-8 h-8 rounded-full mr-2"
              />
            ) : (
              <View className="w-8 h-8 bg-blue-500 rounded-full mr-2 items-center justify-center">
                <Text className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}

            {/* User name */}
            <Text className="text-gray-700 font-medium mr-1">
              {user?.name || 'User'}
            </Text>

            {/* Dropdown arrow */}
            <Ionicons
              name={showUserMenu ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#6b7280"
            />
          </Pressable>

          {/* User dropdown menu */}
          {showUserMenu && (
            <View className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-[999999]">
              {/* User info */}
              <View className="p-4 border-b border-gray-200">
                <Text className="font-medium text-gray-900">{user?.name}</Text>
                <Text className="text-sm text-gray-500">{user?.email}</Text>
                <Text className="text-xs text-gray-400 mt-1">
                  Role: {user?.userType || 'Manager'}
                </Text>
              </View>

              {/* Menu items */}
              <View className="py-2">
                <Pressable
                  onPress={() => {
                    setShowUserMenu(false);
                    // TODO: Navigate to profile page
                  }}
                  className="px-4 py-3 hover:bg-gray-50 flex-row items-center"
                >
                  <Ionicons
                    name="person"
                    size={16}
                    color="#6b7280"
                    className="mr-3"
                  />
                  <Text className="text-gray-700">Profile</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowUserMenu(false);
                    // TODO: Navigate to settings page
                  }}
                  className="px-4 py-3 hover:bg-gray-50 flex-row items-center"
                >
                  <Ionicons
                    name="settings"
                    size={16}
                    color="#6b7280"
                    className="mr-3"
                  />
                  <Text className="text-gray-700">Settings</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowUserMenu(false);
                    handleSignOut();
                  }}
                  className="px-4 py-3 hover:bg-gray-50 flex-row items-center"
                >
                  <Ionicons
                    name="log-out"
                    size={16}
                    color="#ef4444"
                    className="mr-3"
                  />
                  <Text className="text-red-600">Sign Out</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
