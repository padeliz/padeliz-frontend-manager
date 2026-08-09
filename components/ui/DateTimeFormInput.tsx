/**
 * DateTimeFormInput (native)
 *
 * Date/time form input for iOS and Android. Renders a Pressable that opens
 * `@react-native-community/datetimepicker`. The web build uses
 * `DateTimePicker.web.tsx` instead, which Metro resolves automatically.
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

export interface DateTimeFormInputProps {
  inputType: 'date' | 'datetime' | 'time';
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

function formatForDisplay(date: Date, inputType: DateTimeFormInputProps['inputType']): string {
  if (!date || isNaN(date.getTime())) return '';
  switch (inputType) {
    case 'date':
      return date.toISOString().split('T')[0];
    case 'time':
      return date.toTimeString().split(' ')[0];
    case 'datetime':
      return date.toISOString().slice(0, 16);
    default:
      return date.toISOString();
  }
}

export default function DateTimeFormInput({
  inputType,
  value,
  onChange,
  placeholder,
  disabled = false,
  hasError = false,
  minDate,
  maxDate,
}: DateTimeFormInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = value ? formatForDisplay(value, inputType) : '';

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      setIsFocused(false);
    }
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <View>
      <Pressable
        onPress={() => {
          if (!disabled) {
            setShowPicker(true);
            setIsFocused(true);
          }
        }}
        className={`
          border rounded-lg px-3 py-2 flex-row items-center justify-between
          ${isFocused ? 'border-blue-500' : 'border-gray-300'}
          ${hasError ? 'border-red-500' : ''}
          ${disabled ? 'bg-gray-100' : 'bg-white'}
        `}
      >
        <Text
          className={`
            text-base flex-1
            ${disabled ? 'text-gray-500' : 'text-gray-900'}
            ${!displayValue ? 'text-gray-400' : ''}
          `}
        >
          {displayValue || placeholder || 'Select date'}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={disabled ? '#9CA3AF' : '#6B7280'}
        />
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode={inputType === 'time' ? 'time' : 'date'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minDate}
          maximumDate={maxDate}
        />
      )}
    </View>
  );
}
