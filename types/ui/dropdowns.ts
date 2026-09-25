/**
 * Dropdown Component Types
 * Type definitions for dropdown components
 */

import { ReactNode } from 'react';

export interface DropdownOption {
  label: string;
  value: string | number | boolean;
  imageUrl?: string | null;
}

export interface FloatingDropdownProps {
  trigger: ReactNode;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  children: ReactNode;
  title: string;
  maxHeight?: number;
  minWidth?: number;
  disabled?: boolean;
  footer?: ReactNode;
}

export interface SingleSelectDropdownProps {
  options: DropdownOption[];
  selectedValue: string | number | boolean | null;
  onSelectionChange: (value: string | number | boolean | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  title: string;
  maxHeight?: number;
  minWidth?: number;
  defaultValue?: string | number | boolean;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  loading?: boolean;
  /** When true, a clear control calls onSelectionChange(null). Default false. */
  clearable?: boolean;
  /** Notified when the floating menu opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Optional footer rendered below the options list (same as FloatingDropdown). */
  footer?: ReactNode;
}

export interface MultiSelectDropdownProps {
  options: DropdownOption[];
  selectedValues: (string | number | boolean)[];
  onSelectionChange: (values: (string | number | boolean)[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  title: string;
  maxHeight?: number;
  minWidth?: number;
  maxSelections?: number;
}
