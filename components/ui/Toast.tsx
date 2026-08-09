/**
 * Toast Notification Component
 * Cross-platform toast notifications for success, error, warning, and info messages
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { UiToastProps } from '@/types/ui/components';

const toastConfig = {
  success: {
    icon: 'checkmark-circle' as const,
    bgColor: 'bg-green-500',
    iconColor: 'text-white',
    borderColor: 'border-green-600',
  },
  error: {
    icon: 'close-circle' as const,
    bgColor: 'bg-red-500',
    iconColor: 'text-white',
    borderColor: 'border-red-600',
  },
  warning: {
    icon: 'warning' as const,
    bgColor: 'bg-yellow-500',
    iconColor: 'text-white',
    borderColor: 'border-yellow-600',
  },
  info: {
    icon: 'information-circle' as const,
    bgColor: 'bg-blue-500',
    iconColor: 'text-white',
    borderColor: 'border-blue-600',
  },
};

export default function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  onPress,
}: UiToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose(id);
    });
  };

  const config = toastConfig[type];

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
      className="mb-2"
    >
      <Pressable
        onPress={onPress}
        className={`
          ${config.bgColor} ${config.borderColor}
          border-l-4 rounded-lg shadow-lg
          p-4 mx-4
          flex-row items-start
        `}
      >
        <Ionicons name={config.icon} size={24} className={config.iconColor} />

        <View className="flex-1 ml-3">
          <Text className="text-white font-semibold text-base">{title}</Text>
          {message && (
            <Text className="text-white/90 text-sm mt-1">{message}</Text>
          )}
        </View>

        <Pressable onPress={handleClose} className="ml-2 p-1">
          <Ionicons name="close" size={20} className="text-white/80" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
