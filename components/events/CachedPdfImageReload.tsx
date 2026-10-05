/**
 * Cached PDF image slot: renders the cached image when the URL is present,
 * otherwise a spinning refresh control that regenerates it on demand.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

type Props = {
  testIdPrefix: string;
  imageUrl: string | null;
  size?: number;
  disabled?: boolean;
  spinning?: boolean;
  errorReason?: string | null;
  onReload: () => void;
  /** Defaults to a circle. Pass 0 (or a small value) for couple composites. */
  borderRadius?: number;
};

export default function CachedPdfImageReload({
  testIdPrefix,
  imageUrl,
  size = 36,
  disabled = false,
  spinning = false,
  errorReason = null,
  onReload,
  borderRadius,
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) {
      spin.stopAnimation();
      spin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinning, spin]);

  if (imageUrl) {
    return (
      <Image
        testID={`${testIdPrefix}-present`}
        source={{ uri: imageUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: borderRadius ?? size / 2,
        }}
      />
    );
  }

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View className="items-center" style={{ width: size }}>
      <Pressable
        testID={`${testIdPrefix}-reload`}
        disabled={disabled || spinning}
        onPress={onReload}
        accessibilityState={{ disabled: disabled || spinning }}
        className="items-center justify-center"
        style={{ width: size, height: size, opacity: disabled ? 0.4 : 1 }}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons
            name="refresh"
            size={Math.max(12, Math.round(size * 0.6))}
            color="#4b5563"
          />
        </Animated.View>
      </Pressable>
      {errorReason ? (
        <Text
          testID={`${testIdPrefix}-error`}
          className="text-[10px] text-red-600 text-center mt-0.5"
          numberOfLines={3}
        >
          {errorReason}
        </Text>
      ) : null}
    </View>
  );
}
