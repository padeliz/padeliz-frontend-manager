/**
 * Toast Context Types
 * Types for toast context and state management
 */

import { UiToastProps } from '../ui/components';

export interface ContextToastState {
  toasts: UiToastProps[];
}

export type ContextToastAction =
  | { type: 'ADD_TOAST'; payload: Omit<UiToastProps, 'onClose'> }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_ALL' };

export interface ContextToast {
  addToast: (toast: Omit<UiToastProps, 'id' | 'onClose'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

export interface ContextToastProviderProps {
  children: React.ReactNode;
}
