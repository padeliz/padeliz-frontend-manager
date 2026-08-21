import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface SidebarProps {
  currentPath: string;
  onNavigate: () => void;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
}

export const managerNavigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: 'home',
    description: 'Overview and quick actions',
  },
  {
    label: 'Clubs',
    href: '/clubs',
    icon: 'business',
    description: 'Manage padel clubs',
  },
  {
    label: 'Divisions',
    href: '/divisions',
    icon: 'layers',
    description: 'Player skill divisions',
  },
  {
    label: 'Editions',
    href: '/editions',
    icon: 'calendar',
    description: 'Tournament editions',
  },
  {
    label: 'Edition Divisions',
    href: '/edition-divisions',
    icon: 'git-branch',
    description: 'Edition–division pairings',
  },
  {
    label: 'Players',
    href: '/players',
    icon: 'people',
    description: 'Player management',
  },
  {
    label: 'Custom fields',
    href: '/player-custom-fields',
    icon: 'options',
    description: 'Player custom field definitions',
  },
  {
    label: 'Locations',
    href: '/locations',
    icon: 'location',
    description: 'Court locations',
  },
  {
    label: 'Courts',
    href: '/courts',
    icon: 'grid',
    description: 'Physical courts',
  },
  {
    label: 'Participations',
    href: '/edition-participations',
    icon: 'person-add',
    description: 'Player participations',
  },
  {
    label: 'Registrations',
    href: '/edition-registrations',
    icon: 'ticket',
    description: 'Player registrations',
  },
  {
    label: 'Eligibilities',
    href: '/eligibilities',
    icon: 'checkmark-done',
    description: 'Player eligibility reviews',
  },
  {
    label: 'Prizes',
    href: '/prizes',
    icon: 'trophy',
    description: 'Tournament prizes',
  },
  {
    label: 'Sponsors',
    href: '/sponsors',
    icon: 'ribbon',
    description: 'Lottery sponsors',
  },
  {
    label: 'Sponsor Prizes',
    href: '/sponsor-prizes',
    icon: 'gift',
    description: 'Sponsor prize overlays',
  },
  {
    label: 'Lotteries',
    href: '/edition-lotteries',
    icon: 'shuffle',
    description: 'Tournament lotteries',
  },
  {
    label: 'Lottery Prizes',
    href: '/edition-lottery-prizes',
    icon: 'cube',
    description: 'Lottery prize lines',
  },
  {
    label: 'Lottery Rules',
    href: '/edition-lottery-rules',
    icon: 'list',
    description: 'Lottery eligibility rules',
  },
  {
    label: 'Lucky Ones',
    href: '/edition-lottery-luckies',
    icon: 'star',
    description: 'Lottery winners',
  },
  {
    label: 'Templates',
    href: '/tools/templates',
    icon: 'construct',
    description: 'Tools — catalog & scratch schedule',
  },
];

const navigationItems = managerNavigationItems;

export default function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const handleNavigation = (href: string) => {
    // Use the pathname from the hook instead of the prop
    const router = require('expo-router');
    router.router.push(href);
    onNavigate();
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/(app)';
    }
    return pathname?.startsWith(href) || false;
  };

  return (
    <View className="flex-1 bg-white">
      {/* Navigation Items */}
      <ScrollView className="flex-1">
        <View className="py-4">
          {navigationItems.map(item => {
            const active = isActive(item.href);
            return (
              <Pressable
                key={item.href}
                onPress={() => handleNavigation(item.href)}
                className={`px-6 py-3 mx-2 rounded-lg mb-1 ${
                  active
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? '#2563eb' : '#6b7280'}
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className={`font-medium ${
                        active ? 'text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {item.label}
                    </Text>
                    {item.description && (
                      <Text className="text-xs text-gray-500 mt-1">
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="p-4 border-t border-gray-200">
        <Text className="text-xs text-gray-400 text-center">
          Padeliz Manager v1.0
        </Text>
      </View>
    </View>
  );
}
