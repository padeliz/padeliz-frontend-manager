/**
 * Loading Spinner Component
 * Reusable loading indicator with different sizes and styles
 */

import { UiLoadingSpinnerProps } from '@/types/ui/components';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function LoadingSpinner({
  size = 'large',
  color = '#3B82F6', // blue-500
  text,
  fullScreen = false,
  overlay = false,
}: UiLoadingSpinnerProps) {
  const containerClass = fullScreen
    ? 'flex-1 justify-center items-center bg-white'
    : overlay
      ? 'absolute inset-0 justify-center items-center bg-black/50 z-50'
      : 'justify-center items-center py-8';

  return (
    <View className={containerClass}>
      <View className="items-center">
        <ActivityIndicator size={size} color={color} />
        {text && <Text className="text-gray-600 mt-3 text-center">{text}</Text>}
      </View>
    </View>
  );
}
