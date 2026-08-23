/**
 * Floating tooltip on web (hover/focus); long-press alert on native.
 */

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom';
import React, { useCallback, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { isWebPlatform } from '@/utils/isWebPlatform';

/** Above FloatingDropdown modal z-index on web */
const TOOLTIP_Z_INDEX = 200001;

type Props = {
  content: string;
  children: React.ReactNode;
  disabled?: boolean;
  testID?: string;
};

export default function Tooltip({
  content,
  children,
  disabled = false,
  testID,
}: Props) {
  const [open, setOpen] = useState(false);
  const reactId = useId();
  const tooltipId = `tooltip-${reactId.replace(/:/g, '')}`;

  const isOpen = open && !disabled && content !== '';

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const show = useCallback(() => {
    if (!disabled && content !== '') {
      setOpen(true);
    }
  }, [content, disabled]);

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  const handleLongPress = useCallback(() => {
    if (!disabled && content !== '') {
      Alert.alert('', content);
    }
  }, [content, disabled]);

  if (!isWebPlatform()) {
    return (
      <Pressable
        testID={testID}
        onLongPress={handleLongPress}
        accessibilityHint={content || undefined}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <>
      <View
        testID={testID}
        collapsable={false}
        ref={node => {
          refs.setReference(node as unknown as HTMLElement);
        }}
        onFocus={show}
        onBlur={hide}
        // @ts-expect-error RN Web mouse events for hover tooltips
        onMouseEnter={show}
        // @ts-expect-error RN Web mouse events for hover tooltips
        onMouseLeave={hide}
        accessibilityDescribedBy={isOpen ? tooltipId : undefined}
      >
        {children}
      </View>
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <View
            testID="tooltip-content"
            accessibilityRole="tooltip"
            nativeID={tooltipId}
            style={{
              position: 'absolute',
              top: floatingStyles.top,
              left: floatingStyles.left,
              zIndex: TOOLTIP_Z_INDEX,
              maxWidth: 320,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 6,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text className="text-xs text-gray-900">{content}</Text>
          </View>,
          document.body
        )}
    </>
  );
}
