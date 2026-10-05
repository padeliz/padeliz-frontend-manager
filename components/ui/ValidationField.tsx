/**
 * Validation Field Component
 * Dynamic form field with real-time validation
 * Simplified to use unified field formatter
 */

import { UiValidationFieldProps } from '@/types/ui/forms';
import { formatField } from '@/utils/fieldFormatter';
import {
  schemaToValidationRules,
  validateField,
} from '@/utils/validationRules';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import AppTextInput from '@/components/ui/AppTextInput';
import { Pressable, Text, View } from 'react-native';
import DateTimeFormInput from './DateTimeFormInput';
import ColorFormInput from './ColorFormInput';
import YearFormInput from './YearFormInput';
import SingleSelectDropdown from './SingleSelectDropdown';
import RichTextEditor from './RichTextEditor';

export default function ValidationField({
  field,
  metadata,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  placeholder,
}: UiValidationFieldProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get validation rules for this field
  const validationRules = schemaToValidationRules(field);

  // Validate field value
  const validateValue = useCallback(
    (val: any) => {
      if (validationRules.length === 0) {
        setLocalError(null);
        return;
      }

      const errors = validateField(field, val, validationRules);
      const firstError = errors[0];

      setLocalError(firstError ? firstError.message : null);
    },
    [field, validationRules]
  );

  // Validate on value change
  useEffect(() => {
    if (value !== undefined && value !== null) {
      validateValue(value);
    }
  }, [value, validateValue]);

  // Handle input change
  const handleChange = useCallback(
    (newValue: any) => {
      onChange(newValue);
    },
    [onChange]
  );

  // Handle input blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    validateValue(value);
    if (onBlur) {
      onBlur();
    }
  }, [value, validateValue, onBlur]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Date utility functions
  const parseDateValue = useCallback((dateValue: any): Date | null => {
    if (!dateValue) return null;

    if (dateValue instanceof Date) {
      return dateValue;
    }

    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof dateValue === 'number') {
      // Handle Unix timestamp
      return new Date(dateValue * 1000);
    }

    return null;
  }, []);

  const formatDateForAPI = useCallback(
    (date: Date, inputType: string): string | number => {
      if (!date || isNaN(date.getTime())) return '';

      switch (inputType) {
        case 'date':
          return date.toISOString().split('T')[0]; // YYYY-MM-DD
        case 'time':
          return date.toTimeString().split(' ')[0]; // HH:MM:SS
        case 'datetime':
          return date.toISOString(); // Full ISO string
        default:
          return date.toISOString();
      }
    },
    []
  );

  // Initialize selected date from value
  useEffect(() => {
    const parsedDate = parseDateValue(value);
    setSelectedDate(parsedDate);
  }, [value, parseDateValue]);

  // Get display error (local validation or prop error)
  const displayError = error || localError;

  // Render different input types using unified formatter
  const renderInput = () => {
    // Use unified formatter to get field information
    const fieldInfo = formatField({
      metadata,
      fieldKey: field.name,
      fieldValue: value,
      mode: 'form',
    });

    const fieldPlaceholder =
      placeholder || fieldInfo.placeholder || `Enter ${field.name}`;
    switch (fieldInfo.inputType) {
      case 'text':
      case 'email':
      case 'url':
      case 'number':
        return (
          <AppTextInput
            value={String(fieldInfo.inputValue || '')}
            onChangeText={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={fieldPlaceholder}
            keyboardType={fieldInfo.keyboardType}
            autoCapitalize={
              fieldInfo.inputType === 'email' ? 'none' : 'sentences'
            }
            autoCorrect={fieldInfo.inputType === 'email' ? false : true}
            editable={!disabled}
            className={`
              border rounded-lg px-3 py-2 text-base
              ${isFocused ? 'border-blue-500' : 'border-gray-300'}
              ${displayError ? 'border-red-500' : ''}
              ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'}
            `}
          />
        );

      case 'date':
      case 'datetime':
      case 'time':
        return (
          <DateTimeFormInput
            inputType={fieldInfo.inputType}
            value={selectedDate}
            onChange={date => {
              setSelectedDate(date);
              onChange(
                date ? formatDateForAPI(date, fieldInfo.inputType) : ''
              );
            }}
            placeholder={fieldPlaceholder}
            disabled={disabled}
            hasError={!!displayError}
            minDate={
              fieldInfo.constraints?.min
                ? new Date(fieldInfo.constraints.min)
                : undefined
            }
            maxDate={
              fieldInfo.constraints?.max
                ? new Date(fieldInfo.constraints.max)
                : undefined
            }
          />
        );

      case 'color':
        return (
          <ColorFormInput
            value={String(fieldInfo.inputValue || '')}
            onChange={hex => handleChange(hex)}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={fieldPlaceholder}
            error={displayError}
          />
        );

      case 'year':
        return (
          <YearFormInput
            value={fieldInfo.inputValue}
            onChange={year => handleChange(year)}
            onBlur={handleBlur}
            disabled={disabled}
            min={fieldInfo.constraints?.min ?? 1900}
            max={fieldInfo.constraints?.max ?? 9999}
            error={displayError}
            placeholder={fieldPlaceholder}
          />
        );

      case 'readonly':
        return (
          <View className="border rounded-lg px-3 py-2 bg-gray-50">
            <Text className="text-base text-gray-700">
              {String(fieldInfo.inputValue || '')}
            </Text>
          </View>
        );

      case 'textarea':
        return (
          <AppTextInput
            value={String(fieldInfo.inputValue || '')}
            onChangeText={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={fieldPlaceholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!disabled}
            className={`
              border rounded-lg px-3 py-2 text-base
              ${isFocused ? 'border-blue-500' : 'border-gray-300'}
              ${displayError ? 'border-red-500' : ''}
              ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'}
            `}
          />
        );

      case 'richtext':
        return (
          <RichTextEditor
            value={String(fieldInfo.inputValue || '')}
            onChange={html => handleChange(html)}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={fieldPlaceholder}
            error={displayError}
          />
        );

      case 'select': {
        const enumOptions = (fieldInfo.constraints.enum ?? []).map(v => ({
          value: v,
          label: String(v),
        }));
        const selectedValue =
          fieldInfo.inputValue === null ||
          fieldInfo.inputValue === undefined ||
          fieldInfo.inputValue === ''
            ? null
            : fieldInfo.inputValue;

        return (
          <SingleSelectDropdown
            options={enumOptions}
            selectedValue={selectedValue}
            onSelectionChange={v => {
              handleChange(v);
              handleBlur();
            }}
            placeholder={fieldPlaceholder}
            title={fieldPlaceholder}
            disabled={disabled}
            clearable={field.nullable === true}
            minWidth={280}
          />
        );
      }

      case 'checkbox':
        return (
          <Pressable
            onPress={() => handleChange(!fieldInfo.inputValue)}
            className="flex-row items-center"
          >
            <View
              className={`
              w-5 h-5 border-2 rounded mr-2 items-center justify-center
              ${fieldInfo.inputValue ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
            `}
            >
              {fieldInfo.inputValue && (
                <Ionicons name="checkmark" size={16} className="text-white" />
              )}
            </View>
            <Text className="text-base text-gray-900">
              {field.description || field.name}
            </Text>
          </Pressable>
        );

      default:
        console.error(
          `❌ Unsupported input type for field ${field.name}:`,
          fieldInfo
        );
        throw new Error(`Unsupported input type ${fieldInfo.inputType}`);
    }
  };

  return (
    <View className="mb-4">
      {renderInput()}

      {displayError && (
        <View className="flex-row items-center mt-1">
          <Ionicons
            name="alert-circle"
            size={16}
            className="text-red-500 mr-1"
          />
          <Text className="text-sm text-red-600">{displayError}</Text>
        </View>
      )}
    </View>
  );
}
