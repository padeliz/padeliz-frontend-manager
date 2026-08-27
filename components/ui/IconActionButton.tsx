import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable } from 'react-native';

export type IconActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  accessibilityLabel: string;
  testID?: string;
  disabled?: boolean;
  onPress: () => void;
  className?: string;
};

export default function IconActionButton({
  icon,
  color,
  size = 20,
  accessibilityLabel,
  testID,
  disabled = false,
  onPress,
  className = 'px-1',
}: IconActionButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      className={className}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}
