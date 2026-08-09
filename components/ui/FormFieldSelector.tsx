/**
 * Form Field Selector Component
 * Handles foreign key selection with dropdown interface
 */

import { FormFieldSelectorProps } from '@/types/utils/field-formatter';
import { ForeignKeyService } from '@/utils/foreignKeyService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface SelectorOption {
  id: number;
  label: string;
}

export default function FormFieldSelector({
  fieldKey,
  fieldValue,
  metadata,
  onChange,
  onBlur,
  error,
  disabled = false,
  placeholder,
}: FormFieldSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<SelectorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SelectorOption | null>(null);

  // Get linked resource info
  const linkedResourceInfo = ForeignKeyService.getLinkedResourceInfo(fieldKey, metadata);

  // Load options when component mounts or when linked resource info changes
  useEffect(() => {
    if (linkedResourceInfo) {
      loadOptions();
    }
  }, [linkedResourceInfo]);

  // Update selected option when field value changes
  useEffect(() => {
    if (fieldValue && options.length > 0) {
      const option = options.find(opt => opt.id === fieldValue);
      setSelectedOption(option || null);
    } else {
      setSelectedOption(null);
    }
  }, [fieldValue, options]);

  const loadOptions = useCallback(async () => {
    if (!linkedResourceInfo) return;

    try {
      setLoading(true);
      const fetchedOptions = await linkedResourceInfo.fetchOptions();
      setOptions(fetchedOptions);
    } catch (error) {
      console.error('Error loading options:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [linkedResourceInfo]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen(!isOpen);
  }, [disabled, isOpen]);

  const handleSelect = useCallback((option: SelectorOption) => {
    setSelectedOption(option);
    onChange(option.id);
    setIsOpen(false);
    if (onBlur) {
      onBlur();
    }
  }, [onChange, onBlur]);

  const handleClear = useCallback(() => {
    setSelectedOption(null);
    onChange(null);
    setIsOpen(false);
    if (onBlur) {
      onBlur();
    }
  }, [onChange, onBlur]);

  const displayText = selectedOption ? selectedOption.label : placeholder || `Select ${fieldKey.replace('_id', '')}`;

  return (
    <View className="relative">
      <Pressable
        onPress={handleToggle}
        disabled={disabled}
        className={`
          border rounded-lg px-3 py-2 flex-row items-center justify-between min-h-[44px]
          ${isOpen ? 'border-blue-500' : 'border-gray-300'}
          ${error ? 'border-red-500' : ''}
          ${disabled ? 'bg-gray-100' : 'bg-white'}
        `}
      >
        <Text
          className={`
            text-base flex-1
            ${disabled ? 'text-gray-500' : 'text-gray-900'}
            ${!selectedOption ? 'text-gray-400' : ''}
          `}
          numberOfLines={1}
        >
          {displayText}
        </Text>

        <View className="flex-row items-center ml-2">
          {selectedOption && !disabled && (
            <Pressable
              onPress={handleClear}
              className="mr-2 p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} className="text-gray-400" />
            </Pressable>
          )}

          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            className="text-gray-400"
          />
        </View>
      </Pressable>

      {isOpen && (
        <View className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 mt-1">
          {loading ? (
            <View className="p-4 items-center">
              <Text className="text-gray-500">Loading options...</Text>
            </View>
          ) : options.length > 0 ? (
            <ScrollView className="max-h-60">
              {options.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => handleSelect(option)}
                  className={`
                    px-3 py-2 border-b border-gray-100
                    ${selectedOption?.id === option.id ? 'bg-blue-50' : ''}
                  `}
                >
                  <Text
                    className={`
                      text-base
                      ${selectedOption?.id === option.id ? 'text-blue-600 font-medium' : 'text-gray-900'}
                    `}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View className="p-4">
              <Text className="text-gray-500 text-center">No options available</Text>
            </View>
          )}
        </View>
      )}

      {error && (
        <View className="flex-row items-center mt-1">
          <Ionicons
            name="alert-circle"
            size={16}
            className="text-red-500 mr-1"
          />
          <Text className="text-sm text-red-600">{error}</Text>
        </View>
      )}
    </View>
  );
}
