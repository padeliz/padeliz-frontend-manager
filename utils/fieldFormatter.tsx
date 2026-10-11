/**
 * Unified Field Formatter Utility
 * Centralized field formatting for both display and form modes
 * Replaces fieldDisplayFormatter and formFieldFormatter
 */

import { ApiResourceMetadata } from '@/types/api/metadata';
import {
  FieldFormatterOptions,
  FieldFormatterResult
} from '@/types/utils/field-formatter';
import React from 'react';
import { Text } from 'react-native';
import { ForeignKeyService } from './foreignKeyService';
import { isNestedRelationProperty } from './nestedRelationProperty';
import { isRichTextField } from './richtextMetadata';
import {
  bucharestDatetimeLocalToUnix,
  unixToBucharestDatetimeLocal,
} from './productDateTime';

// Constants for better maintainability
const NULL_DISPLAY = '-';
const TEXT_STYLES = {
  null: 'text-gray-400',
  default: 'text-gray-900 text-sm',
  muted: 'text-gray-600',
  mono: 'text-gray-900 text-sm font-mono',
  boolean: {
    true: 'text-green-600',
    false: 'text-gray-500',
  },
} as const;

/**
 * Main unified field formatting function
 */
export function formatField({
  metadata,
  fieldKey,
  fieldValue,
  mode,
  record = null,
}: FieldFormatterOptions): FieldFormatterResult {
  // Get field definition from metadata
  const fieldDefinition = metadata.swagger_schema.properties[fieldKey];

  if (!fieldDefinition) {
    // Field definition not found in schema - this indicates a schema mismatch
    console.error(
      `Field definition not found for field: ${fieldKey} in schema`
    );
    throw new Error(
      `Field '${fieldKey}' not found in API schema. Please check the field name and schema definition.`
    );
  }

  // Check if field is editable
  const isEditable = isFieldEditable(fieldKey, metadata);

  // Check if field is read-only
  const isReadOnly = fieldDefinition.readOnly;

  // FK detection: metadata filterable_fields only (no name guessing)
  const isForeignKey = ForeignKeyService.isForeignKeyField(
    fieldKey,
    fieldDefinition,
    metadata
  );
  const linkedResourceInfo = isForeignKey
    ? ForeignKeyService.getLinkedResourceInfo(fieldKey, metadata)
    : null;

  // Get field label
  const label = getFieldDisplayLabel(fieldKey, metadata);

  // Initialize result with common properties
  const result: FieldFormatterResult = {
    displayValue: (
      <Text className={TEXT_STYLES.default}>
        {String(fieldValue ?? NULL_DISPLAY)}
      </Text>
    ),
    formattedText: String(fieldValue ?? NULL_DISPLAY),
    label,
    inputType: 'text',
    inputValue: fieldValue,
    apiValue: fieldValue,
    keyboardType: 'default',
    fieldType: fieldDefinition.type || 'unknown',
    fieldFormat: fieldDefinition.format,
    isEditable,
    isForeignKey,
    constraints: {},
    placeholder: fieldDefinition.description || `Enter ${fieldKey}`,
    linkedResourceInfo: linkedResourceInfo || undefined,
  };

  // Nested relation objects ($ref / oneOf) — not form inputs
  if (isNestedRelationProperty(fieldDefinition)) {
    result.inputType = 'readonly';
    result.isEditable = false;
    if (fieldValue && typeof fieldValue === 'object') {
      const text = labelFromNestedObject(fieldValue, 'name') ?? JSON.stringify(fieldValue);
      result.displayValue = (
        <Text className={TEXT_STYLES.muted}>{text}</Text>
      );
      result.formattedText = text;
    }
    return result;
  }

  // FK selector for forms (before integer → number path). Save keeps *_id via apiValue.
  if (isForeignKey && (mode === 'form' || mode === 'both')) {
    result.inputType = 'foreign_key_selector';
    result.inputValue = fieldValue;
    result.apiValue =
      fieldValue === null || fieldValue === undefined || fieldValue === ''
        ? null
        : Number(fieldValue);
    if (mode === 'both' || mode === 'display') {
      applyFkDisplayLabel(result, fieldKey, fieldValue, metadata, record);
    }
    if (isReadOnly) {
      result.inputType = 'readonly';
      result.isEditable = false;
    }
    return result;
  }

  // FK display: label from nested BelongsTo object on the record (no async lookup)
  if (isForeignKey && mode === 'display') {
    applyFkDisplayLabel(result, fieldKey, fieldValue, metadata, record);
    if (isReadOnly) {
      result.inputType = 'readonly';
      result.isEditable = false;
    }
    return result;
  }

  // Handle null/undefined values
  if (fieldValue === null || fieldValue === undefined) {
    if (mode === 'display' || mode === 'both') {
      result.displayValue = (
        <Text className={TEXT_STYLES.null}>{NULL_DISPLAY}</Text>
      );
      result.formattedText = NULL_DISPLAY;
    }
    if (mode === 'form' || mode === 'both') {
      result.inputValue = '';
      result.apiValue = null;
      if (
        fieldDefinition.enum?.length &&
        fieldDefinition.type !== 'array' &&
        !isForeignKey
      ) {
        result.inputType = 'select';
        result.constraints.enum = fieldDefinition.enum;
      } else if (fieldDefinition.format === 'time') {
        result.inputType = 'time';
      } else if (fieldDefinition.format === 'date') {
        result.inputType = 'date';
      } else if (fieldDefinition.format === 'date-time') {
        result.inputType = 'datetime';
      } else if (fieldDefinition.format === 'timestamp') {
        result.inputType = 'datetime';
      } else if (fieldDefinition.format === 'year') {
        result.inputType = 'year';
      } else if (fieldDefinition.format === 'color') {
        result.inputType = 'color';
      } else if (isRichTextField(fieldDefinition)) {
        result.inputType = 'richtext';
      }
    }
    if (isReadOnly) {
      result.inputType = 'readonly';
      result.isEditable = false;
    }
    return result;
  }

  // Handle different field types

  let finalResult: FieldFormatterResult;

  switch (fieldDefinition.type) {
    case 'boolean':
      finalResult = formatBooleanField(
        fieldValue,
        fieldDefinition,
        result,
        mode
      );
      break;

    case 'integer':
    case 'number':
      finalResult = formatNumberField(
        fieldValue,
        fieldDefinition,
        result,
        mode
      );
      break;

    case 'string':
      finalResult = formatStringField(
        fieldValue,
        fieldDefinition,
        result,
        mode
      );
      break;

    case 'array':
      finalResult = formatArrayField(fieldValue, fieldDefinition, result, mode);
      break;

    default:
      console.warn(
        `Unsupported field type: ${fieldDefinition.type} for field: ${fieldKey}`
      );
      result.inputType = 'readonly';
      result.isEditable = false;
      finalResult = result;
  }

  // Enum → single-select (after type formatting; before readOnly so readOnly wins)
  if (
    fieldDefinition.enum?.length &&
    fieldDefinition.type !== 'array' &&
    finalResult.inputType !== 'foreign_key_selector'
  ) {
    if (mode === 'form' || mode === 'both') {
      finalResult.inputType = 'select';
      finalResult.constraints.enum = fieldDefinition.enum;
    }
  }

  // Apply readOnly after type formatting (timestamps/booleans must still format)
  if (isReadOnly) {
    finalResult.inputType = 'readonly';
    finalResult.isEditable = false;
  }

  return finalResult;
}

function labelFromNestedObject(
  nest: Record<string, any>,
  displayField: string
): string | null {
  if (!nest || typeof nest !== 'object') return null;
  const candidates = [
    displayField,
    'name',
    'title',
    'label',
    'division_title',
  ];
  for (const key of candidates) {
    if (nest[key] != null && nest[key] !== '') {
      return String(nest[key]);
    }
  }
  return null;
}

function applyFkDisplayLabel(
  result: FieldFormatterResult,
  fieldKey: string,
  fieldValue: any,
  metadata: ApiResourceMetadata,
  record: Record<string, any> | null | undefined
): void {
  if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
    result.displayValue = (
      <Text className={TEXT_STYLES.null}>{NULL_DISPLAY}</Text>
    );
    result.formattedText = NULL_DISPLAY;
    return;
  }

  const displayField =
    metadata.filterable_fields?.[fieldKey]?.related_schema_field || 'name';
  const linked = ForeignKeyService.resolveLinkedProperty(fieldKey, metadata);
  const nest =
    linked && record ? record[linked.key] : null;
  const labelText =
    (nest && typeof nest === 'object'
      ? labelFromNestedObject(nest, displayField)
      : null) ?? String(fieldValue);

  result.displayValue = (
    <Text className={TEXT_STYLES.default}>{labelText}</Text>
  );
  result.formattedText = labelText;
}

/**
 * Check if a field is editable based on its properties and metadata
 */
function isFieldEditable(
  fieldKey: string,
  metadata: ApiResourceMetadata
): boolean {
  const fieldDefinition = metadata.swagger_schema.properties[fieldKey];

  // Skip array fields (relationships)
  if (fieldDefinition.type === 'array') {
    return false;
  }

  // Read-only fields are still included but marked as non-editable
  // They will be displayed with inputType: 'readonly'
  return true;
}

/**
 * Format boolean fields
 */
function formatBooleanField(
  fieldValue: any,
  fieldDefinition: any,
  result: FieldFormatterResult,
  mode: 'display' | 'form' | 'both'
): FieldFormatterResult {
  const boolValue = Boolean(fieldValue);
  const displayText = boolValue ? 'Yes' : 'No';
  const textColor = boolValue
    ? TEXT_STYLES.boolean.true
    : TEXT_STYLES.boolean.false;

  if (mode === 'display' || mode === 'both') {
    result.displayValue = (
      <Text className={`text-sm font-medium ${textColor}`}>{displayText}</Text>
    );
    result.formattedText = displayText;
  }

  if (mode === 'form' || mode === 'both') {
    result.inputType = 'checkbox';
    result.inputValue = boolValue;
    result.apiValue = boolValue;
  }

  return result;
}

/**
 * Format number fields
 */
function formatNumberField(
  fieldValue: any,
  fieldDefinition: any,
  result: FieldFormatterResult,
  mode: 'display' | 'form' | 'both'
): FieldFormatterResult {
  // Handle timestamp format specially - check this BEFORE numValue validation
  if (fieldDefinition.format === 'timestamp') {
    const numValue = Number(fieldValue);
    const useProductWallTime = !fieldDefinition.readOnly;

    if (mode === 'display' || mode === 'both') {
      const formattedText = formatTimestamp(numValue);
      result.displayValue = (
        <Text className={TEXT_STYLES.muted}>{formattedText}</Text>
      );
      result.formattedText = formattedText;
    }
    if (mode === 'form' || mode === 'both') {
      result.inputType = 'datetime';
      result.keyboardType = 'default';

      if (typeof fieldValue === 'number' && !isNaN(fieldValue)) {
        result.inputValue = useProductWallTime
          ? unixToBucharestDatetimeLocal(fieldValue)
          : new Date(fieldValue * 1000).toISOString().slice(0, 16);
        result.apiValue = fieldValue;
      } else if (typeof fieldValue === 'string' && fieldValue) {
        result.inputValue = fieldValue;
        if (useProductWallTime) {
          result.apiValue = bucharestDatetimeLocalToUnix(fieldValue);
        } else {
          const date = new Date(fieldValue);
          result.apiValue = Math.floor(date.getTime() / 1000);
        }
      } else {
        result.inputValue = '';
        result.apiValue = null;
      }
    }
    return result;
  }

  // For non-timestamp fields, validate the number value
  const numValue = Number(fieldValue);

  if (isNaN(numValue)) {
    if (mode === 'display' || mode === 'both') {
      result.displayValue = (
        <Text className={TEXT_STYLES.null}>{NULL_DISPLAY}</Text>
      );
      result.formattedText = NULL_DISPLAY;
    }
    if (mode === 'form' || mode === 'both') {
      result.inputValue = '';
      result.apiValue = null;
    }
    return result;
  }

  // Handle integer formats (int64), year, and number formats (float)
  if (fieldDefinition.format === 'year') {
    if (mode === 'form' || mode === 'both') {
      result.inputType = 'year';
      result.keyboardType = 'numeric';
      result.inputValue = numValue;
      result.apiValue = numValue;
    }
    if (mode === 'display' || mode === 'both') {
      const text = String(numValue);
      result.displayValue = <Text className={TEXT_STYLES.mono}>{text}</Text>;
      result.formattedText = text;
    }
  } else if (fieldDefinition.format === 'int64' || fieldDefinition.format === 'float' || !fieldDefinition.format) {
    if (mode === 'form' || mode === 'both') {
      result.inputType = 'number';
      result.keyboardType = 'numeric';
    }
    if (mode === 'display' || mode === 'both') {
      result.displayValue = (
        <Text className={TEXT_STYLES.mono}>{numValue.toLocaleString()}</Text>
      );
      result.formattedText = numValue.toLocaleString();
    }
    if (mode === 'form' || mode === 'both') {
      result.inputValue = String(fieldValue);
      result.apiValue = numValue;
    }
  } else {
    console.warn(
      `Unknown number format: ${fieldDefinition.format} for field type ${result.fieldType}`
    );
    if (mode === 'form' || mode === 'both') {
      result.inputType = 'number';
      result.keyboardType = 'numeric';
      result.inputValue = String(fieldValue);
      result.apiValue = numValue;
    }
    if (mode === 'display' || mode === 'both') {
      result.displayValue = (
        <Text className={TEXT_STYLES.mono}>{numValue.toLocaleString()}</Text>
      );
      result.formattedText = numValue.toLocaleString();
    }
  }

  // Add constraints
  if (fieldDefinition.minimum !== undefined) {
    result.constraints.min = fieldDefinition.minimum;
  }
  if (fieldDefinition.maximum !== undefined) {
    result.constraints.max = fieldDefinition.maximum;
  }

  return result;
}

/**
 * Format string fields
 */
function formatStringField(
  fieldValue: any,
  fieldDefinition: any,
  result: FieldFormatterResult,
  mode: 'display' | 'form' | 'both'
): FieldFormatterResult {
  const stringValue =
    fieldValue === null || fieldValue === undefined ? '' : String(fieldValue);

  if (isRichTextField(fieldDefinition)) {
    if (mode === 'form' || mode === 'both') {
      result.inputType = 'richtext';
      result.inputValue = stringValue;
      result.apiValue = stringValue === '' ? null : stringValue;
    }
    if (mode === 'display' || mode === 'both') {
      result.displayValue = (
        <Text className={TEXT_STYLES.default}>{stringValue || NULL_DISPLAY}</Text>
      );
      result.formattedText = stringValue || NULL_DISPLAY;
    }
    return result;
  }

  // Handle different string formats
  if (fieldDefinition.format) {
    switch (fieldDefinition.format) {
      case 'email':
        if (mode === 'form' || mode === 'both') {
          result.inputType = 'email';
          result.keyboardType = 'email-address';
        }
        break;
      case 'uri':
        if (mode === 'form' || mode === 'both') {
          result.inputType = 'url';
          result.keyboardType = 'url';
        }
        break;
      case 'date':
        if (mode === 'display' || mode === 'both') {
          const formattedText = formatDate(stringValue);
          result.displayValue = (
            <Text className={TEXT_STYLES.muted}>{formattedText}</Text>
          );
          result.formattedText = formattedText;
        }
        if (mode === 'form' || mode === 'both') {
          result.inputType = 'date';
        }
        break;
      case 'date-time':
        if (mode === 'display' || mode === 'both') {
          const formattedText = formatDateTime(stringValue);
          result.displayValue = (
            <Text className={TEXT_STYLES.muted}>{formattedText}</Text>
          );
          result.formattedText = formattedText;
        }
        if (mode === 'form' || mode === 'both') {
          result.inputType = 'datetime';
        }
        break;
      case 'time':
        if (mode === 'display' || mode === 'both') {
          const formattedText = formatTime(stringValue);
          result.displayValue = (
            <Text className={TEXT_STYLES.muted}>{formattedText}</Text>
          );
          result.formattedText = formattedText;
        }
        if (mode === 'form' || mode === 'both') {
          result.inputType = 'time';
        }
        break;
      case 'binary':
        if (mode === 'form' || mode === 'both') {
          result.inputType = 'textarea'; // Binary data should be handled as textarea
        }
        break;
      case 'color':
        if (mode === 'form' || mode === 'both') {
          result.inputType = 'color';
        }
        break;
      default:
        console.warn(
          `Unknown string format: ${fieldDefinition.format} for field: ${result.fieldType}`
        );
        if (mode === 'form' || mode === 'both') {
          result.inputType = 'text';
        }
    }
  } else {
    // No format specified - check if it should be a textarea based on maxLength

    if (mode === 'form' || mode === 'both') {
      if (fieldDefinition.maxLength && fieldDefinition.maxLength > 255) {
        result.inputType = 'textarea';
      } else {
        result.inputType = 'text'; // Default to text input for regular strings
      }
    }
  }

  // Format value for input
  if (mode === 'form' || mode === 'both') {
    if (fieldDefinition.format === 'color' && stringValue) {
      const normalized = stringValue.startsWith('#')
        ? stringValue.toUpperCase()
        : `#${stringValue.toUpperCase()}`;
      result.inputValue = normalized;
      result.apiValue = normalized === '#' ? null : normalized;
    } else {
      result.inputValue = stringValue;
      result.apiValue = stringValue === '' ? null : stringValue;
    }
  }

  if (mode === 'display' || mode === 'both') {
    result.displayValue = (
      <Text className={TEXT_STYLES.default}>{stringValue}</Text>
    );
    result.formattedText = stringValue;
  }

  // Add constraints
  if (fieldDefinition.minLength !== undefined) {
    result.constraints.minLength = fieldDefinition.minLength;
  }
  if (fieldDefinition.maxLength !== undefined) {
    result.constraints.maxLength = fieldDefinition.maxLength;
  }
  if (fieldDefinition.pattern) {
    result.constraints.pattern = fieldDefinition.pattern;
  }

  return result;
}

/**
 * Format array fields
 */
function formatArrayField(
  fieldValue: any,
  fieldDefinition: any,
  result: FieldFormatterResult,
  mode: 'display' | 'form' | 'both'
): FieldFormatterResult {
  let inputValue: any = fieldValue;

  // Handle array value formatting
  if (mode === 'form' || mode === 'both') {
    // For form input, ensure array format
    if (inputValue === null || inputValue === undefined) {
      inputValue = [];
    } else if (!Array.isArray(inputValue)) {
      inputValue = [inputValue];
    }

    result.inputType = 'select'; // Multi-select dropdown
    result.inputValue = inputValue;

    // For API, ensure proper array format
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      result.apiValue = [];
    } else if (Array.isArray(inputValue)) {
      result.apiValue = inputValue;
    } else {
      // Convert single value to array if needed
      result.apiValue = [inputValue];
    }
  }

  if (mode === 'display' || mode === 'both') {
    const displayText = Array.isArray(fieldValue) ? fieldValue.join(', ') : String(fieldValue);
    result.displayValue = <Text className={TEXT_STYLES.default}>{displayText}</Text>;
    result.formattedText = displayText;
  }

  return result;
}

/**
 * Format timestamp values
 */
function formatTimestamp(timestamp: number): string {
  try {
    const date = new Date(timestamp * 1000);
    return formatDateWithOrdinal(date, true);
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return String(timestamp);
  }
}

/**
 * Format date with custom format (month day with ordinal suffix)
 */
function formatDateWithOrdinal(
  date: Date,
  includeTime: boolean = false
): string {
  const currentYear = new Date().getFullYear();
  const dateYear = date.getFullYear();

  // Get month name
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const monthName = monthNames[date.getMonth()];

  // Get day with ordinal suffix
  const day = date.getDate();
  const dayWithSuffix = getOrdinalSuffix(day);

  // Check for relative time indicators
  const now = new Date();
  const timeDiff = now.getTime() - date.getTime();
  const minutesDiff = Math.floor(timeDiff / (1000 * 60));
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  // Check if it's today or yesterday
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    daysDiff === 1 &&
    date.toDateString() ===
      new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

  // Format based on relative time and year
  let dateString: string;
  if (isToday) {
    if (includeTime && minutesDiff < 3) {
      dateString = 'right now';
    } else if (includeTime && minutesDiff < 60) {
      dateString = 'recently';
    } else {
      dateString = 'today';
    }
  } else if (isYesterday) {
    dateString = 'yesterday';
  } else if (dateYear === currentYear) {
    dateString = `${monthName} ${dayWithSuffix}`;
  } else {
    dateString = `${monthName} ${dayWithSuffix}, ${dateYear}`;
  }

  // Add time if requested
  if (includeTime) {
    const timeString = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${dateString} at ${timeString}`;
  }

  return dateString;
}

/**
 * Format date strings
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDateWithOrdinal(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Format date strings for display (e.g. event header, resource fields).
 */
export function formatDisplayDate(dateString: string): string {
  return formatDate(dateString);
}

/**
 * Get ordinal suffix for day numbers
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

/**
 * Format date-time strings
 */
function formatDateTime(dateTimeString: string): string {
  try {
    const date = new Date(dateTimeString);
    return formatDateWithOrdinal(date, true);
  } catch (error) {
    console.error('Error formatting date-time:', error);
    return dateTimeString;
  }
}

/**
 * Format time strings
 */
function formatTime(timeString: string): string {
  try {
    // Extract H:i from H:i:s format
    return timeString.substring(0, 5);
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
}

/**
 * Extract text content from React node for plain text representation
 */
function extractTextFromReactNode(node: React.ReactNode): string {
  if (typeof node === 'string') {
    return node;
  }

  if (typeof node === 'number') {
    return String(node);
  }

  if (React.isValidElement(node)) {
    // For React elements, try to extract text from children
    const props = node.props as any;
    if (typeof props.children === 'string') {
      return props.children;
    }

    if (typeof props.children === 'number') {
      return String(props.children);
    }

    // For more complex children, return a placeholder
    return '[Complex Content]';
  }

  return String(node);
}

/**
 * Get field display label from metadata
 */
function getFieldDisplayLabel(
  fieldKey: string,
  metadata: ApiResourceMetadata
): string {
  const fieldDefinition = metadata.swagger_schema.properties[fieldKey];

  if (!fieldDefinition) {
    return convertSnakeCaseToTitleCase(fieldKey);
  }

  // Use title if available
  if (fieldDefinition.title) {
    return fieldDefinition.title;
  }

  // Use description if available
  if (fieldDefinition.description) {
    return fieldDefinition.description;
  }

  return convertSnakeCaseToTitleCase(fieldKey);
}

/**
 * Convert snake_case to Title Case
 */
function convertSnakeCaseToTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
