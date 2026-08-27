/**
 * Advanced Search and Filters Component
 * Provides search, filtering, and sorting capabilities
 */

import { UtilFilterDefinition } from '@/types/common/filtering';
import { UiAdvancedSearchFiltersProps } from '@/types/ui/components';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import AppTextInput from '@/components/ui/AppTextInput';
import { Pressable, Text, View } from 'react-native';
import MultiSelectDropdown from './MultiSelectDropdown';

export default function AdvancedSearchFilters({
  searchQuery,
  searchInput,
  searchPlaceholder,
  onInputChange,
  onSearch,
  onKeyPress,
  onBlur,
  onClear,
  activeFilters,
  filterDefinitions,
  onFilter,
}: UiAdvancedSearchFiltersProps) {
  const renderFilterInput = (filter: UtilFilterDefinition) => {
    const value = activeFilters[filter.field];

    return (
      <MultiSelectDropdown
        options={filter.options || []}
        selectedValues={Array.isArray(value) ? value : value ? [value] : []}
        onSelectionChange={values => {
          onFilter(filter.field, values.length > 0 ? values : undefined);
        }}
        placeholder={filter.placeholder || `Select ${filter.label}`}
        title={filter.label}
      />
    );
  };

  return (
    <View className="bg-white border border-gray-200 rounded-lg mb-4">
      {/* Search and Filters Row */}
      <View className="p-4">
        <View className="flex-row items-end gap-4">
          {/* Search Field */}
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Search
            </Text>
            <View className="relative">
              <Ionicons
                name="search"
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <AppTextInput
                value={searchInput}
                onChangeText={onInputChange}
                onKeyPress={onKeyPress}
                onBlur={onBlur}
                placeholder={searchPlaceholder}
                className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-base"
                returnKeyType="search"
                onSubmitEditing={onSearch}
              />
              {searchQuery && (
                <Pressable
                  onPress={onClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    className="text-gray-400"
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* Filter Dropdowns */}
          {filterDefinitions.map(filter => (
            <View
              key={filter.field}
              style={{ width: filter.width || 200 }}
              className="min-w-[120px]"
            >
              <Text className="text-sm font-medium text-gray-700 mb-2">
                {filter.label}
              </Text>
              {renderFilterInput(filter)}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
