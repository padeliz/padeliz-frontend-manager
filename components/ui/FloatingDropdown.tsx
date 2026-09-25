/**
 * Base Floating Dropdown Component
 * Provides consistent modal-based floating dropdown behavior across all platforms
 */

import { FloatingDropdownProps } from '@/types/ui/dropdowns';
import React from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

/** Above TopNavigation z-[99999] on web */
const MODAL_Z_INDEX = 200000;

export default function FloatingDropdown({
  trigger,
  isOpen,
  onOpen,
  onClose,
  children,
  title,
  maxHeight,
  minWidth,
  disabled = false,
  footer,
}: FloatingDropdownProps) {
  const screenHeight = Dimensions.get('window').height;
  const maxModalHeight = maxHeight
    ? Math.min(maxHeight, screenHeight * 0.8)
    : screenHeight * 0.8;

  return (
    <>
      <Pressable onPress={() => !disabled && onOpen()} disabled={disabled}>
        {trigger}
      </Pressable>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent={Platform.OS === 'android'}
        {...(Platform.OS === 'web'
          ? ({ style: { zIndex: MODAL_Z_INDEX } } as any)
          : {})}
      >
        <Pressable
          className="flex-1 bg-black bg-opacity-50 justify-center items-center"
          style={
            Platform.OS === 'web'
              ? ({ zIndex: MODAL_Z_INDEX } as any)
              : undefined
          }
          onPress={onClose}
        >
          <Pressable
            onPress={e => {
              // Prevent backdrop dismiss when interacting with the panel
              e?.stopPropagation?.();
            }}
            className="bg-white rounded-lg shadow-lg"
            style={{
              minWidth,
              maxHeight: maxModalHeight,
              ...(Platform.OS === 'web'
                ? ({ zIndex: MODAL_Z_INDEX + 1 } as any)
                : {}),
            }}
          >
            <View className="px-4 py-3 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">
                {title}
              </Text>
            </View>

            <View className="flex-1 bg-white">{children}</View>

            {footer != null && footer !== false && footer !== '' ? (
              <View
                testID="floating-dropdown-footer"
                className="px-4 py-3 border-t border-gray-200 bg-white"
              >
                {footer}
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
