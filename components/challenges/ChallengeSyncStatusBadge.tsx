import type { SyncBadgeState } from '@/lib/challenges/syncStatus';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  badge: SyncBadgeState;
};

const FADE_MS = 200;

export default function ChallengeSyncStatusBadge({ badge }: Props) {
  const [displayLabel, setDisplayLabel] = useState<string | null>(
    badge.label
  );
  const [mounted, setMounted] = useState(Boolean(badge.label));
  const opacity = useSharedValue(badge.label ? 1 : 0);

  useEffect(() => {
    if (badge.label) {
      setDisplayLabel(badge.label);
      setMounted(true);
      opacity.value = withTiming(1, { duration: FADE_MS });
      return;
    }

    if (!displayLabel) {
      return;
    }

    opacity.value = withTiming(0, { duration: FADE_MS }, finished => {
      if (finished) {
        runOnJS(setMounted)(false);
        runOnJS(setDisplayLabel)(null);
      }
    });
  }, [badge.label, displayLabel, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!mounted || !displayLabel) {
    return null;
  }

  const showSavedIcon = badge.phase === 'saved';
  const showFailedIcon = badge.phase === 'failed';

  return (
    <Animated.View
      style={[{ minWidth: 72 }, animatedStyle]}
      className="justify-center px-2"
      testID="challenge-sync-status-badge"
      accessibilityLabel={displayLabel}
    >
      <View className="flex-row items-center gap-1 text-black opacity-30">
        <Text className="text-sm font-medium text-black opacity-30">
          {displayLabel}
        </Text>
        {showSavedIcon ? (
          <View testID="sync-badge-icon-saved">
            <Ionicons name="checkmark" size={14} color="#111827" />
          </View>
        ) : null}
        {showFailedIcon ? (
          <View testID="sync-badge-icon-failed">
            <Ionicons name="close" size={14} color="#111827" />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
