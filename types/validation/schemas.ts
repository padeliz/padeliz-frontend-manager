/**
 * Validation Schema Types
 * Form validation schema definitions
 */

export interface FormValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'custom';
  value?: any;
  message: string;
}

export interface FormFieldSchema {
  name: string;
  type:
    | 'string'
    | 'number'
    | 'boolean'
    | 'array'
    | 'object'
    | 'date'
    | 'email'
    | 'url'
    | 'integer';
  required?: boolean;
  readOnly?: boolean;
  nullable?: boolean;
  description?: string;
  example?: any;
  enum?: any[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: FormFieldSchema;
  properties?: Record<string, FormFieldSchema>;
  validation?: FormValidationRule[];
}

export interface FormResourceSchema {
  type: 'object';
  properties: Record<string, FormFieldSchema>;
  required?: string[];
  title?: string;
  description?: string;
}
