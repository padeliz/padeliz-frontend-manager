/**
 * UI Form Types
 * Form-related component types
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import {
  FormFieldSchema,
  FormResourceSchema,
  FormValidationRule,
} from '@/types/validation/schemas';

export interface UiValidationFieldProps {
  field: FormFieldSchema;
  metadata: ApiResourceMetadata;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export interface UiFormFieldProps {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  description?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: FormValidationRule[];
  disabled?: boolean;
}

export interface UiDynamicFormProps {
  schema: FormResourceSchema;
  metadata: ApiResourceMetadata;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onCancel?: () => void;
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
}
