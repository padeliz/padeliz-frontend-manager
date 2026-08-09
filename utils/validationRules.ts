/**
 * Validation Rules Utilities
 * Schema-based validation logic for dynamic forms
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import {
  FormValidationError,
  FormValidationResult,
} from '@/types/validation/rules';
import {
  FormFieldSchema,
  FormValidationRule,
} from '@/types/validation/schemas';
import { formatField } from './fieldFormatter';

/**
 * Convert API schema to validation rules
 */
export function schemaToValidationRules(
  field: FormFieldSchema
): FormValidationRule[] {
  const rules: FormValidationRule[] = [];

  // Required rule
  if (field.required) {
    rules.push({
      type: 'required',
      message: `${field.name} is required`,
    });
  }

  // Type-specific rules
  switch (field.type) {
    case 'string':
      if (field.minLength !== undefined) {
        rules.push({
          type: 'minLength',
          value: field.minLength,
          message: `${field.name} must be at least ${field.minLength} characters`,
        });
      }
      if (field.maxLength !== undefined) {
        rules.push({
          type: 'maxLength',
          value: field.maxLength,
          message: `${field.name} must be no more than ${field.maxLength} characters`,
        });
      }
      if (field.pattern) {
        rules.push({
          type: 'pattern',
          value: field.pattern,
          message: `${field.name} format is invalid`,
        });
      }
      break;

    case 'number':
      if (field.minimum !== undefined) {
        rules.push({
          type: 'min',
          value: field.minimum,
          message: `${field.name} must be at least ${field.minimum}`,
        });
      }
      if (field.maximum !== undefined) {
        rules.push({
          type: 'max',
          value: field.maximum,
          message: `${field.name} must be no more than ${field.maximum}`,
        });
      }
      break;

    case 'email':
      rules.push({
        type: 'email',
        message: `${field.name} must be a valid email address`,
      });
      break;

    case 'url':
      rules.push({
        type: 'url',
        message: `${field.name} must be a valid URL`,
      });
      break;
  }

  // Add custom validation rules from schema
  if (field.validation) {
    rules.push(...field.validation);
  }

  return rules;
}

/**
 * Validate a single field value against its rules
 */
export function validateField(
  field: FormFieldSchema,
  value: any,
  rules: FormValidationRule[]
): FormValidationError[] {
  const errors: FormValidationError[] = [];

  for (const rule of rules) {
    const error = validateRule(field.name, value, rule);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

/**
 * Validate a single rule
 */
export function validateRule(
  fieldName: string,
  value: any,
  rule: FormValidationRule
): FormValidationError | null {
  switch (rule.type) {
    case 'required':
      if (value === null || value === undefined || value === '') {
        return {
          field: fieldName,
          message: rule.message,
          value,
          rule: 'required',
        };
      }
      break;

    case 'minLength':
      if (typeof value === 'string' && value.length < rule.value) {
        return {
          field: fieldName,
          message: rule.message,
          value,
          rule: 'minLength',
        };
      }
      break;

    case 'maxLength':
      if (typeof value === 'string' && value.length > rule.value) {
        return {
          field: fieldName,
          message: rule.message,
          value,
          rule: 'maxLength',
        };
      }
      break;

    case 'min':
      if (typeof value === 'number' && value < rule.value) {
        return {
          field: fieldName,
          message: rule.message,
          value,
          rule: 'min',
        };
      }
      break;

    case 'max':
      if (typeof value === 'number' && value > rule.value) {
        return {
          field: fieldName,
          message: rule.message,
          value,
          rule: 'max',
        };
      }
      break;

    case 'pattern':
      if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
        return {
          field: fieldName,
          message: rule.message,
          value,
          rule: 'pattern',
        };
      }
      break;

    case 'email':
      if (typeof value === 'string' && !isValidEmail(value)) {
        return {
          field: fieldName,
          message: rule.message,
          value,
          rule: 'email',
        };
      }
      break;

    case 'url':
      if (typeof value === 'string' && !isValidUrl(value)) {
        return {
          field: fieldName,
          message: rule.message,
          value,
          rule: 'url',
        };
      }
      break;

    case 'custom':
      if (rule.value && typeof rule.value === 'function') {
        const result = rule.value(value);
        if (result !== true) {
          return {
            field: fieldName,
            message: result || rule.message,
            value,
            rule: 'custom',
          };
        }
      }
      break;
  }

  return null;
}

/**
 * Validate entire form against schema
 */
export function validateForm(
  schema: any,
  values: Record<string, any>
): FormValidationResult {
  const errors: FormValidationError[] = [];

  if (!schema.properties) {
    return { isValid: true, errors: [] };
  }

  for (const [fieldName, field] of Object.entries(schema.properties)) {
    const fieldSchema = field as FormFieldSchema;
    const value = values[fieldName];
    const rules = schemaToValidationRules(fieldSchema);

    const fieldErrors = validateField(fieldSchema, value, rules);
    errors.push(...fieldErrors);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate form with submission formatting
 * Formats values for submission before validation
 */
export function validateFormWithSubmission(
  schema: any,
  values: Record<string, any>,
  metadata: ApiResourceMetadata
): FormValidationResult {
  const errors: FormValidationError[] = [];

  if (!schema.properties) {
    return { isValid: true, errors: [] };
  }

  for (const [fieldName, field] of Object.entries(schema.properties)) {
    const fieldSchema = field as FormFieldSchema;
    const value = values[fieldName];

    // Format value for validation using unified formatter
    const fieldInfo = formatField({
      metadata,
      fieldKey: fieldName,
      fieldValue: value,
      mode: 'form',
    });
    const formattedValue = fieldInfo.apiValue;

    const rules = schemaToValidationRules(fieldSchema);
    const fieldErrors = validateField(fieldSchema, formattedValue, rules);
    errors.push(...fieldErrors);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper functions
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
