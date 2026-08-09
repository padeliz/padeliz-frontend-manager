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
  const maxModalHeight = maxHeight ? Math.min(maxHeight, screenHeight * 0.8) : screenHeight * 0.8;
  return (
    <>
      {/* Trigger */}
      <Pressable
        onPress={() => !disabled && onOpen()}
        disabled={disabled}
      >
        {trigger}
      </Pressable>

      {/* Floating Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <Pressable
          className="flex-1 bg-black bg-opacity-50 justify-center items-center"
          onPress={onClose}
        >
          <View
            className="bg-white rounded-lg shadow-lg"
            style={{
              minWidth,
              maxHeight: maxModalHeight,
            }}
          >
            {/* Header */}
            <View className="px-4 py-3 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">
                {title}
              </Text>
            </View>

            {/* Content */}
            <View className="flex-1 bg-white">
              {children}
            </View>

            {/* Footer */}
            {footer && (
              <View className="px-4 py-3 border-t border-gray-200 bg-white">
                {footer}
              </View>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
