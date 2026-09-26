/**
 * Floating tooltip on iOS / Android (tap to toggle; tap outside / back to dismiss).
 */

import {
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import {
  tipChromeNative,
  tipTextNative,
  type TooltipProps,
} from '@/components/ui/tooltipShared';

export type { TooltipProps };

export default function Tooltip({
  content,
  children,
  disabled = false,
  testID,
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  const enabled = !disabled && content !== '';

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
    }
  }, [enabled]);

  const { refs, floatingStyles, update } = useFloating({
    placement: 'top',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    sameScrollView: false,
  });

  const isOpen = open && enabled;

  useEffect(() => {
    if (isOpen) {
      update();
    }
  }, [isOpen, update]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (!enabled) {
      return;
    }
    setOpen(prev => !prev);
  }, [enabled]);

  return (
    <>
      <Pressable
        testID={testID}
        collapsable={false}
        ref={refs.setReference}
        onPress={toggle}
        accessibilityHint={content || undefined}
        disabled={disabled}
      >
        {children}
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={close}
        statusBarTranslucent
      >
        <View
          ref={refs.setOffsetParent}
          collapsable={false}
          className="flex-1"
        >
          <Pressable
            testID="tooltip-backdrop"
            accessibilityRole="button"
            className="absolute inset-0"
            onPress={close}
          />
          <View
            testID="tooltip-content"
            accessibilityRole="text"
            collapsable={false}
            ref={refs.setFloating}
            pointerEvents="none"
            style={[floatingStyles, tipChromeNative]}
          >
            <Text style={tipTextNative}>{content}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}