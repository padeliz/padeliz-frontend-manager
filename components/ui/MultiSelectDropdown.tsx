/**
 * Multi-Select Dropdown Component
 * Reusable multi-selection dropdown with floating modal behavior
 */

import { MultiSelectDropdownProps } from '@/types/ui/dropdowns';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import FloatingDropdown from './FloatingDropdown';

export default function MultiSelectDropdown({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = 'Select options...',
  disabled = false,
  className = '',
  title,
  maxHeight,
  minWidth,
  maxSelections,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedValues, setTempSelectedValues] = useState<
    (string | number | boolean)[]
  >([]);

  const handleOptionToggle = (optionValue: string | number | boolean) => {
    const isSelected = tempSelectedValues.includes(optionValue);

    if (isSelected) {
      // Remove from selection
      const newValues = tempSelectedValues.filter(v => v !== optionValue);
      setTempSelectedValues(newValues);
    } else {
      // Add to selection (check max selections)
      if (maxSelections && tempSelectedValues.length >= maxSelections) {
        return; // Don't add if max reached
      }
      const newValues = [...tempSelectedValues, optionValue];
      setTempSelectedValues(newValues);
    }
  };

  const handleClearAll = () => {
    setTempSelectedValues([]);
  };

  const handleApply = () => {
    onSelectionChange(tempSelectedValues);
    setIsOpen(false);
  };

  const handleOpen = () => {
    setTempSelectedValues(selectedValues);
    setIsOpen(true);
  };

  const handleClose = () => {
    setTempSelectedValues([]);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    }

    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option?.label || String(selectedValues[0]);
    }

    return `${selectedValues.length} selected`;
  };

  const isOptionSelected = (optionValue: string | number | boolean) => {
    return tempSelectedValues.includes(optionValue);
  };

  const trigger = (
    <View
      className={`
        border border-gray-300 rounded-lg px-3 py-2 flex-row items-center justify-between
        ${disabled ? 'bg-gray-100' : 'bg-white'}
        ${isOpen ? 'border-blue-500' : ''}
        ${className}
      `}
    >
      <Text
        className={`
          text-base flex-1
          ${selectedValues.length === 0 ? 'text-gray-400' : 'text-gray-900'}
        `}
      >
        {getDisplayText()}
      </Text>
      <View className="flex-row items-center">
        {selectedValues.length > 0 && (
          <Pressable
            onPress={e => {
              e.stopPropagation();
              handleClearAll();
            }}
            className="mr-2 p-1"
          >
            <Ionicons name="close-circle" size={16} className="text-gray-400" />
          </Pressable>
        )}
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          className="text-gray-400"
        />
      </View>
    </View>
  );

  const content = (
    <ScrollView className="flex-1">
      {options.length === 0 ? (
        <View className="p-4">
          <Text className="text-gray-500 text-center">
            No options available
          </Text>
        </View>
      ) : (
        options.map((option, index) => {
          const isSelected = isOptionSelected(option.value);
          const isDisabled = Boolean(
            maxSelections &&
              !isSelected &&
              tempSelectedValues.length >= maxSelections
          );

          return (
            <Pressable
              key={`${option.value}-${index}`}
              onPress={() => !isDisabled && handleOptionToggle(option.value)}
              disabled={isDisabled}
              className={`
                flex-row items-center px-4 py-3 border-b border-gray-100
                ${isSelected ? 'bg-blue-50' : 'bg-white'}
                ${isDisabled ? 'opacity-50' : ''}
                ${index === options.length - 1 ? 'border-b-0' : ''}
              `}
            >
              {/* Checkbox */}
              <View
                className={`
                  w-5 h-5 border-2 rounded mr-3 items-center justify-center
                  ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }
                `}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={14} className="text-white" />
                )}
              </View>

              {/* Option Label */}
              <Text
                className={`
                  text-base flex-1
                  ${isSelected ? 'text-blue-900' : 'text-gray-900'}
                  ${isDisabled ? 'text-gray-400' : ''}
                `}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );

  const footer = (
    <View className="flex-row justify-end space-x-2">
      <Pressable
        onPress={handleClose}
        className="px-4 py-2 border border-gray-300 rounded-lg"
      >
        <Text className="text-gray-700 font-medium">Cancel</Text>
      </Pressable>
      <Pressable
        onPress={handleApply}
        className="px-4 py-2 bg-blue-500 rounded-lg"
      >
        <Text className="text-white font-medium">Apply</Text>
      </Pressable>
    </View>
  );

  return (
    <FloatingDropdown
      trigger={trigger}
      isOpen={isOpen}
      onOpen={handleOpen}
      onClose={handleClose}
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
