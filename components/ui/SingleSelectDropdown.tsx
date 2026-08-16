/**
 * Single Select Dropdown Component
 * Reusable single-selection dropdown with floating modal behavior
 */

import { SingleSelectDropdownProps } from '@/types/ui/dropdowns';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import FloatingDropdown from './FloatingDropdown';

export default function SingleSelectDropdown({
  options,
  selectedValue,
  onSelectionChange,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  title,
  maxHeight,
  minWidth,
  defaultValue,
  searchable = false,
  onSearch,
  loading = false,
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  const handleSelect = (value: string | number | boolean) => {
    onSelectionChange(value);
    close();
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    onSearch?.(text);
  };

  const visibleOptions = useMemo(() => {
    if (!searchable) return options;
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(opt => opt.label.toLowerCase().includes(needle));
  }, [options, query, searchable]);

  const getDisplayText = () => {
    const currentValue = selectedValue !== null && selectedValue !== undefined
      ? selectedValue
      : defaultValue;

    if (currentValue === null || currentValue === undefined) {
      return placeholder;
    }

    const option = options.find(
      opt =>
        opt.value === currentValue ||
        String(opt.value) === String(currentValue) ||
        (typeof opt.value === 'number' &&
          Number(opt.value) === Number(currentValue) &&
          Number.isFinite(Number(currentValue)))
    );
    return option?.label || String(currentValue);
  };

  const trigger = (
    <View
      className={`
        flex-row items-center border border-gray-300 rounded-lg px-3 py-2
        ${disabled ? 'bg-gray-100' : 'bg-white'}
        ${isOpen ? 'border-blue-500' : ''}
        ${className}
      `}
      style={{ minWidth: 60 }}
    >
      <Text
        className={`
          text-base flex-1
          ${(selectedValue === null || selectedValue === undefined) && !defaultValue
            ? 'text-gray-400'
            : 'text-gray-900'
          }
        `}
      >
        {getDisplayText()}
      </Text>
      <Ionicons
        name="chevron-down"
        size={20}
        className="text-gray-400"
      />
    </View>
  );

  const content = (
    <View className="flex-1">
      {searchable && (
        <View className="px-3 py-2 border-b border-gray-200">
          <TextInput
            testID="dropdown-search"
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search..."
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-gray-300 rounded-lg px-3 py-2 text-base text-gray-900"
          />
          {loading && (
            <ActivityIndicator testID="dropdown-loading" className="mt-2" />
          )}
        </View>
      )}
      <ScrollView className="flex-1">
        {visibleOptions.length === 0 ? (
          <View className="p-4">
            <Text className="text-gray-500 text-center">
              No options available
            </Text>
          </View>
        ) : (
          visibleOptions.map((option, index) => {
            const currentValue = selectedValue !== null && selectedValue !== undefined
              ? selectedValue
              : defaultValue;
            const isSelected =
              option.value === currentValue ||
              String(option.value) === String(currentValue) ||
              (typeof option.value === 'number' &&
                Number(option.value) === Number(currentValue) &&
                Number.isFinite(Number(currentValue)));
            return (
              <Pressable
                key={`${option.value}-${index}`}
                onPress={() => handleSelect(option.value)}
                className={`
                  flex-row items-center px-4 py-3 border-b border-gray-100
                  ${isSelected ? 'bg-blue-50' : 'bg-white'}
                  ${index === visibleOptions.length - 1 ? 'border-b-0' : ''}
                `}
                style={{
                  backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                }}
              >
                <View
                  className={`
                    w-5 h-5 border-2 rounded-full mr-3 items-center justify-center
                    ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
                  `}
                >
                  {isSelected && (
                    <View className="w-2 h-2 bg-white rounded-full" />
                  )}
                </View>

                <Text
                  className={`
                    text-base flex-1
                    ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-900'}
                  `}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  return (
    <FloatingDropdown
      trigger={trigger}
      isOpen={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={close}
      title={title}
      maxHeight={maxHeight}
      minWidth={minWidth}
      disabled={disabled}
    >
      {content}
    </FloatingDropdown>
  );
}
