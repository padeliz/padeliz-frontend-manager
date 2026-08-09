import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href as any);
  };

  return (
    <View className="px-6 py-3 bg-white border-b border-gray-200">
      <View className="flex-row items-center">
        {items.map((item, index) => (
          <View key={index} className="flex-row items-center">
            {/* Separator */}
            {index > 0 && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color="#9ca3af"
                className="mx-2"
              />
            )}

            {/* Breadcrumb item */}
            {item.href ? (
              <Pressable
                onPress={() => handleNavigation(item.href!)}
                className="hover:bg-gray-50 px-2 py-1 rounded"
              >
                <Text className="text-blue-600 hover:text-blue-800 font-medium">
                  {item.label}
                </Text>
              </Pressable>
            ) : (
              <Text className="text-gray-900 font-medium px-2 py-1">
                {item.label}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
