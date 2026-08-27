/**
 * Shared Page Header / chrome action button.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type HeaderActionVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'ghost';

export type HeaderActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: HeaderActionVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  iconOnly?: boolean;
  iconColor?: string;
  iconSize?: number;
  testID?: string;
  accessibilityLabel?: string;
};

const variantClass: Record<
  HeaderActionVariant,
  { box: string; text: string; icon: string }
> = {
  primary: {
    box: 'bg-blue-600 border border-blue-600',
    text: 'text-white',
    icon: '#ffffff',
  },
  secondary: {
    box: 'bg-gray-100 border border-gray-300',
    text: 'text-gray-700',
    icon: '#4b5563',
  },
  danger: {
    box: 'bg-red-600 border border-red-600',
    text: 'text-white',
    icon: '#ffffff',
  },
  success: {
    box: 'bg-green-100 border border-green-300',
    text: 'text-green-700',
    icon: '#15803d',
  },
  warning: {
    box: 'bg-orange-100 border border-orange-300',
    text: 'text-orange-700',
    icon: '#c2410c',
  },
  ghost: {
    box: 'bg-gray-600 border border-gray-600',
    text: 'text-white',
    icon: '#ffffff',
  },
};

export default function HeaderActionButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'secondary',
  icon,
  iconOnly = false,
  iconColor,
  iconSize = 18,
  testID,
  accessibilityLabel,
}: HeaderActionButtonProps) {
  const styles = variantClass[variant];
  const locked = disabled || loading;
  const a11yLabel = accessibilityLabel ?? label;

  if (iconOnly && icon) {
    const color = locked
      ? '#9ca3af'
      : (iconColor ?? styles.icon);
    return (
      <Pressable
        testID={testID}
        accessibilityLabel={a11yLabel}
        disabled={locked}
        onPress={onPress}
        className="p-1"
      >
        {loading ? (
          <Text className="text-sm font-medium text-gray-500">Saving…</Text>
        ) : (
          <Ionicons name={icon} size={iconSize} color={color} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={a11yLabel}
      disabled={locked}
      onPress={onPress}
      className={`rounded-lg px-3 py-2 flex-row items-center border ${
        locked ? 'bg-gray-300 border-gray-300' : styles.box
      }`}
    >
      {loading ? (
        <View className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={locked ? '#9ca3af' : styles.icon}
          style={{ marginRight: 4 }}
        />
      ) : null}
      <Text
        className={`text-base font-medium ${
          locked ? 'text-gray-500' : styles.text
        }`}
      >
        {loading ? 'Saving…' : label}
      </Text>
    </Pressable>
  );
}
