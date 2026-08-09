/**
 * Toast Context
 * Global state management for toast notifications
 */

import ToastContainer from '@/components/ui/ToastContainer';
import { UiToastProps } from '@/types/ui/components';
import React, { createContext, ReactNode, useContext, useReducer } from 'react';

interface ToastState {
  toasts: UiToastProps[];
}

type ToastAction =
  | { type: 'ADD_TOAST'; payload: Omit<UiToastProps, 'id' | 'onClose'> }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_ALL' };

interface ToastContextType {
  showToast: (toast: Omit<UiToastProps, 'id' | 'onClose'>) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      const newToast: UiToastProps = {
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        onClose: () => {}, // Will be set by the context
      };
      return {
        ...state,
        toasts: [...state.toasts, newToast],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(toast => toast.id !== action.payload),
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        toasts: [],
      };
    default:
      return state;
  }
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const showToast = (toast: Omit<UiToastProps, 'id' | 'onClose'>) => {
    dispatch({ type: 'ADD_TOAST', payload: toast });
  };

  const showSuccess = (title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  };

  const showError = (title: string, message?: string) => {
    showToast({ type: 'error', title, message });
  };

  const showWarning = (title: string, message?: string) => {
    showToast({ type: 'warning', title, message });
  };

  const showInfo = (title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  };

  const removeToast = (id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  const clearAllToasts = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={state.toasts} onRemoveToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
