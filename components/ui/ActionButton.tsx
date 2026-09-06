/**
 * Shared presentational action button (controlled status).
 */

import Tooltip from '@/components/ui/Tooltip';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

export type ActionButtonStatus =
  | 'idle'
  | 'checking'
  | 'pending'
  | 'success'
  | 'error';

export type ActionButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'positive'
  | 'warning'
  | 'ghost';

export type ActionButtonPendingAppearance = 'spinner' | 'spinIcon';

export type ActionButtonProps = {
  label?: string;
  startIcon?: keyof typeof Ionicons.glyphMap;
  endIcon?: keyof typeof Ionicons.glyphMap;
  iconOnly?: boolean;
  status?: ActionButtonStatus;
  statusSlot?: 'start' | 'end';
  successIcon?: keyof typeof Ionicons.glyphMap;
  errorIcon?: keyof typeof Ionicons.glyphMap;
  checkingIcon?: keyof typeof Ionicons.glyphMap;
  pendingAppearance?: ActionButtonPendingAppearance;
  errorMessage?: string;
  disabledReason?: string;
  variant?: ActionButtonVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
  className?: string;
  iconColor?: string;
  iconSize?: number;
  disabledStyle?: 'mute' | 'opacity';
  statusRecolor?: boolean;
  blockPressOnError?: boolean;
};

const variantClass: Record<
  ActionButtonVariant,
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
  positive: {
    box: 'bg-green-600 border border-green-600',
    text: 'text-white',
    icon: '#ffffff',
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

const statusRecolorClass: Partial<
  Record<ActionButtonStatus, { box: string; text: string; icon: string }>
> = {
  success: {
    box: 'bg-green-100 border border-green-300',
    text: 'text-green-700',
    icon: '#15803d',
  },
  error: {
    box: 'bg-red-100 border border-red-300',
    text: 'text-red-700',
    icon: '#b91c1c',
  },
  checking: {
    box: 'bg-gray-100 border border-gray-300',
    text: 'text-gray-700',
    icon: '#4b5563',
  },
};

function CheckingIcon({
  name,
  size,
  color,
  testID,
}: {
  name: keyof typeof Ionicons.glyphMap;
  size: number;
  color: string;
  testID?: string;
}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    loop.start();
    return () => {
      loop.stop();
      spin.setValue(0);
    };
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      testID={testID}
      style={{ transform: [{ rotate }] }}
    >
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

export default function ActionButton({
  label,
  startIcon,
  endIcon,
  iconOnly = false,
  status = 'idle',
  statusSlot = 'start',
  successIcon = 'checkmark-circle',
  errorIcon = 'alert-circle',
  checkingIcon = 'sync',
  pendingAppearance = 'spinner',
  errorMessage,
  disabledReason,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  onPress,
  testID,
  accessibilityLabel,
  className,
  iconColor,
  iconSize,
  disabledStyle = 'mute',
  statusRecolor = false,
  blockPressOnError = false,
}: ActionButtonProps) {
  const styles = variantClass[variant];
  const recolor =
    statusRecolor && statusRecolorClass[status]
      ? statusRecolorClass[status]
      : null;
  const visual = recolor ?? styles;

  const busy = status === 'pending' || status === 'checking';
  const pressLocked =
    disabled ||
    busy ||
    (blockPressOnError && status === 'error');

  const showDisabledInfo =
    disabled && status === 'idle' && !!disabledReason;

  const tooltipContent =
    status === 'error' && errorMessage
      ? errorMessage
      : showDisabledInfo
        ? disabledReason!
        : '';

  const a11yLabel =
    accessibilityLabel ?? label ?? (startIcon ? String(startIcon) : 'Button');

  const resolvedIconSize =
    iconSize ?? (iconOnly ? 18 : size === 'sm' ? 14 : 16);
  const textSizeClass = size === 'sm' ? 'text-sm' : 'text-base';
  const labelLocked = disabled || busy;

  const slotIconColor = (base?: string) => {
    if (iconOnly && disabled && disabledStyle === 'mute') {
      return '#9ca3af';
    }
    if (labelLocked && !iconOnly) {
      return '#9ca3af';
    }
    return base ?? iconColor ?? visual.icon;
  };

  const renderStatusSlotContent = (
    idleIcon: keyof typeof Ionicons.glyphMap | undefined,
    marginClass: string
  ) => {
    if (status === 'checking') {
      return (
        <View className={marginClass} testID={testID ? `${testID}-checking` : undefined}>
          <CheckingIcon
            name={checkingIcon}
            size={resolvedIconSize}
            color={slotIconColor(visual.icon)}
            testID={testID ? `${testID}-checking-icon` : undefined}
          />
        </View>
      );
    }
    if (status === 'pending') {
      if (pendingAppearance === 'spinIcon' && idleIcon) {
        return (
          <View
            className={marginClass}
            testID={testID ? `${testID}-pending-spin` : undefined}
          >
            <CheckingIcon
              name={idleIcon}
              size={resolvedIconSize}
              color={slotIconColor(visual.icon)}
              testID={testID ? `${testID}-pending-spin-icon` : undefined}
            />
          </View>
        );
      }
      return (
        <View className={marginClass}>
          <ActivityIndicator
            testID={testID ? `${testID}-pending` : 'action-button-pending'}
            size="small"
            color={slotIconColor(visual.icon)}
          />
        </View>
      );
    }
    if (status === 'success') {
      return (
        <View
          className={marginClass}
          testID={testID ? `${testID}-success` : undefined}
        >
          <Ionicons
            name={successIcon}
            size={resolvedIconSize}
            color={slotIconColor('#15803d')}
          />
        </View>
      );
    }
    if (status === 'error') {
      return (
        <View
          className={marginClass}
          testID={testID ? `${testID}-error` : undefined}
        >
          <Ionicons
            name={errorIcon}
            size={resolvedIconSize}
            color={slotIconColor('#b91c1c')}
          />
        </View>
      );
    }
    if (showDisabledInfo) {
      return (
        <View
          className={marginClass}
          testID={testID ? `${testID}-info` : undefined}
        >
          <Ionicons
            name="information-circle"
            size={resolvedIconSize}
            color={slotIconColor('#4b5563')}
          />
        </View>
      );
    }
    if (idleIcon) {
      return (
        <View className={marginClass}>
          <Ionicons
            name={idleIcon}
            size={resolvedIconSize}
            color={slotIconColor()}
          />
        </View>
      );
    }
    return null;
  };

  const startMargin =
    iconOnly || (!label && statusSlot === 'start' && !endIcon)
      ? ''
      : 'mr-1';
  const endMargin = label || startIcon || statusSlot === 'start' ? 'ml-1' : '';

  const startContent =
    statusSlot === 'start'
      ? renderStatusSlotContent(startIcon, startMargin)
      : startIcon
        ? (
            <View className={startMargin}>
              <Ionicons
                name={startIcon}
                size={resolvedIconSize}
                color={slotIconColor()}
              />
            </View>
          )
        : null;

  const endContent =
    statusSlot === 'end'
      ? renderStatusSlotContent(endIcon, endMargin)
      : endIcon
        ? (
            <View className={endMargin}>
              <Ionicons
                name={endIcon}
                size={resolvedIconSize}
                color={slotIconColor()}
              />
            </View>
          )
        : null;

  const handlePress = () => {
    if (pressLocked) return;
    onPress();
  };

  let pressableClass: string;
  if (iconOnly) {
    pressableClass = className ?? 'p-1';
  } else {
    const box = labelLocked
      ? 'bg-gray-300 border-gray-300'
      : visual.box;
    pressableClass =
      className ??
      `rounded-lg px-3 py-2 flex-row items-center border ${box}`;
  }

  const opacityStyle =
    iconOnly && disabled && disabledStyle === 'opacity'
      ? { opacity: 0.4 }
      : undefined;

  const pressableProps = {
    testID,
    accessibilityLabel: a11yLabel,
    accessibilityState: { disabled: pressLocked, busy },
    disabled: pressLocked,
    onPress: pressLocked ? undefined : handlePress,
    className: pressableClass,
    style: opacityStyle,
  };

  const button = (
    <Pressable {...pressableProps}>
      {startContent}
      {!iconOnly && label ? (
        <Text
          className={`${textSizeClass} font-medium ${
            labelLocked ? 'text-gray-500' : visual.text
          }`}
        >
          {label}
        </Text>
      ) : null}
      {!iconOnly ? endContent : null}
    </Pressable>
  );

  const iconOnlyButton = (
    <Pressable {...pressableProps}>
      {renderStatusSlotContent(startIcon, '')}
    </Pressable>
  );

  const node = iconOnly ? iconOnlyButton : button;

  if (tooltipContent) {
    return (
      <Tooltip
        content={tooltipContent}
        testID={testID ? `${testID}-tooltip` : undefined}
      >
        {node}
      </Tooltip>
    );
  }

  return node;
}
