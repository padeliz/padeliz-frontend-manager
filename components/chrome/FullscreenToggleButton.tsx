import ActionButton from '@/components/ui/ActionButton';
import { useLayoutChrome } from '@/hooks/useLayoutChrome';
import React, { useState } from 'react';
import { View } from 'react-native';

export default function FullscreenToggleButton() {
  const { isFullscreen, enterFullscreen } = useLayoutChrome();
  const [hovered, setHovered] = useState(false);

  if (isFullscreen) {
    return null;
  }

  const color = hovered ? '#111827' : '#6b7280';

  return (
    <View
      // @ts-expect-error RN Web mouse events for hover icon color
      onMouseEnter={() => setHovered(true)}
      // @ts-expect-error RN Web mouse events for hover icon color
      onMouseLeave={() => setHovered(false)}
    >
      <ActionButton
        testID="fullscreen-toggle"
        iconOnly
        startIcon="expand-outline"
        iconSize={20}
        iconColor={color}
        accessibilityLabel="Enter fullscreen"
        onPress={enterFullscreen}
      />
    </View>
  );
}
