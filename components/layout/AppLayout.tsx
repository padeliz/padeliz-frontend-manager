import { useAuth } from '@/context/managerAuth';
import { usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useBreadcrumbTrail } from './BreadcrumbProvider';
import Breadcrumbs from './Breadcrumbs';
import AppContentScroll from './AppContentScroll';
import Sidebar from './Sidebar';
import {
  SubTabBarProvider,
  useSubTabBarTrail,
} from './SubTabBarProvider';
import TopNavigation from './TopNavigation';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
  /** Fixed strip under Page Header (e.g. zone top tabs). Not a third header bar. */
  tabBar?: React.ReactNode;
}

function AppLayoutChrome({
  children,
  title,
  description,
  headerActions,
  tabBar,
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();
  const breadcrumbItems = useBreadcrumbTrail();
  const subTabBar = useSubTabBarTrail();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (!user) {
    return null;
  }

  const showPageHeader = !!(title || description || headerActions);

  return (
    <View className="flex-1 min-h-screen bg-gray-50" testID="app-layout">
      <TopNavigation onMenuPress={toggleSidebar} user={user} />

      <View className="flex-1 min-h-0 flex-row">
        <View className="hidden md:flex w-64 bg-white border-r border-gray-200">
          <Sidebar currentPath={pathname} onNavigate={closeSidebar} />
        </View>

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

        <View className="flex-1 min-h-0 flex-col">
          {breadcrumbItems.length > 0 && (
            <Breadcrumbs items={breadcrumbItems} />
          )}

          {showPageHeader && (
            <View
              className="px-6 py-4 bg-white border-b border-gray-200"
              testID="app-page-header"
            >
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <View className="flex-1 min-w-[140px]">
                  {title ? (
                    <Text className="text-2xl font-bold text-gray-900">
                      {title}
                    </Text>
                  ) : null}
                  {description ? (
                    <Text className="text-sm text-gray-600 mt-1">
                      {description}
                    </Text>
                  ) : null}
                </View>
                {headerActions ? (
                  <View
                    className="flex-row flex-wrap items-center gap-2"
                    testID="app-header-actions"
                  >
                    {headerActions}
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {tabBar ? (
            <View testID="app-tab-bar">{tabBar}</View>
          ) : null}

          {subTabBar}

          <View className="flex-1 min-h-0" testID="app-content-column">
            <AppContentScroll>{children}</AppContentScroll>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AppLayout(props: AppLayoutProps) {
  return (
    <SubTabBarProvider>
      <AppLayoutChrome {...props} />
    </SubTabBarProvider>
  );
}
