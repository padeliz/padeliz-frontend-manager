/**
 * Single Select Dropdown Component
 * Reusable single-selection dropdown with floating modal behavior
 */

import AppTextInput from '@/components/ui/AppTextInput';
import { SingleSelectDropdownProps } from '@/types/ui/dropdowns';
import { normalizeSearchText } from '@/utils/textNormalize';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
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
  clearable = false,
  onOpenChange,
  footer,
}: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const close = () => {
    setIsOpen(false);
    setQuery('');
    onOpenChange?.(false);
  };

  const open = () => {
    setIsOpen(true);
    onOpenChange?.(true);
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
    if (onSearch) return options;
    const needle = normalizeSearchText(query);
    if (!needle) return options;
    return options.filter(opt =>
      normalizeSearchText(opt.label).includes(needle)
    );
  }, [onSearch, options, query, searchable]);

  const currentValue =
    selectedValue !== null && selectedValue !== undefined
      ? selectedValue
      : defaultValue;

  const selectedOption = options.find(
    opt =>
      opt.value === currentValue ||
      String(opt.value) === String(currentValue) ||
      (typeof opt.value === 'number' &&
        Number(opt.value) === Number(currentValue) &&
        Number.isFinite(Number(currentValue)))
  );

  const getDisplayText = () => {
    if (currentValue === null || currentValue === undefined) {
      return placeholder;
    }
    return selectedOption?.label || String(currentValue);
  };

  const showClear =
    clearable && currentValue !== null && currentValue !== undefined;

  const avatar = (url?: string | null, testID?: string) => {
    if (url === undefined) return null;
    if (url) {
      return (
        <Image
          testID={testID}
          source={{ uri: url }}
          className="w-6 h-6 rounded-full mr-2"
          style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
        />
      );
    }
    return (
      <View
        testID={testID}
        className="w-6 h-6 rounded-full mr-2 bg-gray-200 items-center justify-center"
        style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
      >
        <Ionicons name="person" size={14} className="text-gray-500" />
      </View>
    );
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
      {selectedOption ? avatar(selectedOption.imageUrl, 'dropdown-trigger-image') : null}
      <Text
        numberOfLines={1}
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
      {showClear ? (
        <Pressable
          testID="dropdown-clear"
          onPress={e => {
            e?.stopPropagation?.();
            onSelectionChange(null);
          }}
          hitSlop={8}
          className="mr-1 p-1"
        >
          <Ionicons name="close-circle" size={18} className="text-gray-400" />
        </Pressable>
      ) : null}
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
        <View
          testID="dropdown-search-wrapper"
          className="px-3 py-2 border-b border-gray-200"
        >
          <AppTextInput
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

                {avatar(option.imageUrl, `dropdown-option-image-${option.value}`)}

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
      onOpen={open}
      onClose={close}
      title={title}
      maxHeight={maxHeight}
      minWidth={minWidth}
      disabled={disabled}
      footer={footer}
    >
      {content}
    </FloatingDropdown>
  );
}
