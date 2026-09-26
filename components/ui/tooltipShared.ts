/**
 * Shared Tooltip types and tip chrome (visual parity across web / iOS / Android).
 */

import type { CSSProperties, ReactNode } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';

/** Above FloatingDropdown modal z-index on web */
export const TOOLTIP_Z_INDEX = 200001;

export type TooltipProps = {
  content: string;
  children: ReactNode;
  disabled?: boolean;
  testID?: string;
};

export const tipChromeNative: ViewStyle = {
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
};

export const tipTextNative: TextStyle = {
  fontSize: 12,
  color: '#111827',
};

export const tipChromeWeb: CSSProperties = {
  zIndex: TOOLTIP_Z_INDEX,
  maxWidth: 320,
  padding: '6px 10px',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  fontSize: 12,
  color: '#111827',
  pointerEvents: 'none',
};
