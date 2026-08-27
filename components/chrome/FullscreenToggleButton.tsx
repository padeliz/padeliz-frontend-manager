import { useLayoutChrome } from '@/hooks/useLayoutChrome';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable } from 'react-native';

export default function FullscreenToggleButton() {
  const { isFullscreen, enterFullscreen } = useLayoutChrome();
  const [hovered, setHovered] = useState(false);

  if (isFullscreen) {
    return null;
  }

  const color = hovered ? '#111827' : '#6b7280';

  return (
    <Pressable
      testID="fullscreen-toggle"
      accessibilityLabel="Enter fullscreen"
      onPress={enterFullscreen}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className="p-1"
    >
      <Ionicons name="expand-outline" size={20} color={color} />
    </Pressable>
  );
}
