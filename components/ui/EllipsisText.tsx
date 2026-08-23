/**
 * Single-line truncated text with optional floating tooltip or web title fallback.
 */

import React from 'react';
import { Alert, Text, TextProps, View } from 'react-native';
import { isWebPlatform } from '@/utils/isWebPlatform';
import Tooltip from './Tooltip';

type Props = TextProps & {
  children: string;
  /** Floating tooltip content (label + value). When set, replaces native title. */
  tooltip?: string;
  /** Max width in px for truncated text. */
  maxWidth?: number;
  /** When true on native, long-press shows full value in an alert. */
  longPressAlert?: boolean;
};

export default function EllipsisText({
  children,
  className = '',
  tooltip,
  maxWidth,
  longPressAlert = false,
  numberOfLines = 1,
  style,
  ...rest
}: Props) {
  const useTitleFallback =
    isWebPlatform() && !tooltip && children !== '';
  const webTitle = useTitleFallback ? { title: children } : {};

  const handleLongPress = () => {
    if (longPressAlert && children !== '') {
      Alert.alert('', children);
    }
  };

  const textStyle = maxWidth != null ? [{ maxWidth }, style] : style;

  const text = (
    <Text
      {...rest}
      {...webTitle}
      numberOfLines={numberOfLines}
      ellipsizeMode="tail"
      onLongPress={longPressAlert ? handleLongPress : rest.onLongPress}
      className={`truncate ${className}`.trim()}
      style={textStyle}
    >
      {children}
    </Text>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip} testID={rest.testID ? `${rest.testID}-tooltip` : undefined}>
        <View collapsable={false} style={maxWidth != null ? { maxWidth } : undefined}>
          {text}
        </View>
      </Tooltip>
    );
  }

  return text;
}
