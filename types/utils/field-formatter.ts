/**
 * Unified Field Formatter Types
 * Comprehensive field formatting with display and form information
 */

import React from 'react';
import { ApiResourceMetadata } from '../api/metadata';

export interface FieldFormatterOptions {
  metadata: ApiResourceMetadata;
  fieldKey: string;
  fieldValue: any;
  mode: 'display' | 'form' | 'both';
  /** Full API record — used to resolve BelongsTo nest labels for FK fields */
  record?: Record<string, any> | null;
}

export interface FieldFormatterResult {
  // Display information
  displayValue: React.ReactNode;
  formattedText: string;
  label: string;

  // Form information
  inputType: FormInputType;
  inputValue: any;
  apiValue: any;
  keyboardType: KeyboardType;

  // Schema information
  fieldType: string;
  fieldFormat?: string;
  isEditable: boolean;
  isForeignKey: boolean;

  // Constraints
  constraints: FormFieldConstraints;

  // Additional metadata
  placeholder?: string;
  linkedResourceInfo?: LinkedResourceInfo;
}

export interface FormFieldConstraints {
  min?: number;
  max?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  enum?: any[];
}

export interface LinkedResourceInfo {
  resourceName: string;
  displayField: string;
  fetchOptions: () => Promise<Array<{id: number, label: string}>>;
}

export type FormInputType =
  | 'text'
  | 'number'
  | 'email'
  | 'url'
  | 'textarea'
  | 'date'
  | 'datetime'
  | 'time'
  | 'year'
  | 'color'
  | 'select'
  | 'checkbox'
  | 'foreign_key_selector'
  | 'readonly';

export type KeyboardType =
  | 'default'
  | 'email-address'
  | 'numeric'
  | 'phone-pad'
  | 'url';

export type FieldFormatterMode = 'display' | 'form' | 'both';

export interface FormFieldSelectorProps {
  fieldKey: string;
  fieldValue: any;
  metadata: ApiResourceMetadata;
  onChange: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}
