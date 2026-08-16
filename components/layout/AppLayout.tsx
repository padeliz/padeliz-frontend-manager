import { useAuth } from '@/context/managerAuth';
import { usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Breadcrumbs from './Breadcrumbs';
import Sidebar from './Sidebar';
import TopNavigation from './TopNavigation';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  headerActions?: React.ReactNode;
}

export default function AppLayout({
  children,
  title,
  breadcrumbs,
  headerActions,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (!user) {
    return null; // Don't render layout if not authenticated
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Top Navigation */}
      <TopNavigation onMenuPress={toggleSidebar} user={user} />

      <View className="flex-1 flex-row">
        {/* Sidebar - Desktop */}
        <View className="hidden md:flex w-64 bg-white border-r border-gray-200">
          <Sidebar currentPath={pathname} onNavigate={closeSidebar} />
        </View>

        {/* Sidebar - Mobile Overlay */}
        {sidebarOpen && (
          <View className="md:hidden absolute inset-0 z-50">
            <View
              className="absolute inset-0 bg-black bg-opacity-50"
              onTouchEnd={closeSidebar}
            />
            <View className="absolute left-0 top-0 bottom-0 w-64 bg-white">
              <Sidebar currentPath={pathname} onNavigate={closeSidebar} />
            </View>
          </View>
        )}

        {/* Main Content */}
        <View className="flex-1 flex-col">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} />
          )}

          {/* Page Title and Header Actions */}
          {title && (
            <View className="px-6 py-4 bg-white border-b border-gray-200">
              <View className="flex-row items-center justify-between">
                <Text className="text-2xl font-bold text-gray-900">
                  {title}
                </Text>
                {headerActions && (
                  <View className="flex-row items-center">{headerActions}</View>
                )}
              </View>
            </View>
          )}

          {/* Page Content */}
          <ScrollView className="flex-1">
            <View className="p-6">{children}</View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
