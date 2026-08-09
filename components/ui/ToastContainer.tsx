/**
 * Toast Container Component
 * Manages and displays multiple toast notifications
 */

import { UiToastContainerProps } from '@/types/ui/components';
import React from 'react';
import { View } from 'react-native';
import Toast from './Toast';

export default function ToastContainer({
  toasts,
  onRemoveToast,
}: UiToastContainerProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <View className="absolute top-12 left-0 right-0 z-[999999]">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={onRemoveToast} />
      ))}
    </View>
  );
}
