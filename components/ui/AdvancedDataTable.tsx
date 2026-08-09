/**
 * Advanced Data Table Component
 * Enhanced version with advanced features
 */

import { UiAdvancedDataTableProps, UiDataTableColumn } from '@/types/ui/tables';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import LoadingSpinner from './LoadingSpinner';
import SingleSelectDropdown from './SingleSelectDropdown';

// Cross-platform dropdown component
function PerPageDropdown({
  currentValue,
  onValueChange,
}: {
  currentValue: number;
  onValueChange: (value: number) => void;
}) {
  const options = [
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
  ];

  return (
    <SingleSelectDropdown
      options={options}
      selectedValue={currentValue}
      onSelectionChange={value => onValueChange(value as number)}
      placeholder="Select items per page"
      title="Items per page"
      minWidth={120}
      defaultValue={10}
    />
  );
}

export default function AdvancedDataTable<T extends { [key: string]: any }>({
  data,
  columns,
  primaryKeyField,
  loading = false,
  error = null,
  pagination,
  bulkActions,
  sorting,
  emptyMessage = 'No data available',
  className = '',
}: UiAdvancedDataTableProps<T>) {
  const handleSelectAll = () => {
    bulkActions?.onSelectAll();
  };

  const handleSelectItem = (item: T) => {
    bulkActions?.onSelectItem(item);
  };

  const isItemSelected = (item: T) => {
    if (!bulkActions) return false;

    const itemId = item[primaryKeyField] as number;
    if (!itemId) return false;

    return bulkActions.selectedItems.some(selected => {
      const selectedId = selected[primaryKeyField] as number;
      return selectedId === itemId;
    });
  };

  const getSortIcon = (field: string) => {
    if (!sorting?.config[field]) {
      return 'swap-vertical-outline';
    }
    return sorting.config[field] === 'asc' ? 'chevron-up' : 'chevron-down';
  };

  const getSortColor = (field: string) => {
    if (!sorting?.config[field]) {
      return 'text-gray-400';
    }
    return 'text-blue-600';
  };

  const handleHeaderClick = (column: UiDataTableColumn<T>) => {
    if (!column.sortable || !sorting) return;
    // Allow sorting even during loading - this will cancel the current request and start a new one
    sorting.onSort(column.key as string);
  };

  const renderCell = (item: T, column: UiDataTableColumn<T>, index: number) => {
    if (column.render) {
      return column.render(item, index);
    }

    const value = item[column.key as keyof T];

    // Use basic formatting for fallback when no custom renderer is provided
    if (value === null || value === undefined) {
      return <Text className="text-gray-400">-</Text>;
    }

    switch (column.type) {
      case 'boolean':
        return (
          <View className="flex-row items-center">
            <View
              className={`
              w-4 h-4 border-2 rounded items-center justify-center
              ${value ? 'bg-green-500 border-green-500' : 'border-gray-300'}
            `}
            >
              {value && (
                <Ionicons name="checkmark" size={12} className="text-white" />
              )}
            </View>
          </View>
        );

      case 'date':
        return (
          <Text className="text-gray-900 text-sm">
            {new Date(value).toLocaleDateString()}
          </Text>
        );

      case 'number':
        return (
          <Text className="text-gray-900 text-sm font-mono">
            {Number(value).toLocaleString()}
          </Text>
        );

      default:
        return <Text className="text-gray-900 text-sm">{String(value)}</Text>;
    }
  };

  // Remove the full-screen loading - we'll show loading overlay on table body instead

  if (error) {
    return (
      <View className="bg-red-50 border border-red-200 rounded-lg p-6">
        <View className="flex-row items-center">
          <Ionicons
            name="alert-circle"
            size={24}
            className="text-red-500 mr-3"
          />
          <View className="flex-1">
            <Text className="text-red-800 font-semibold mb-1">
              Error Loading Data
            </Text>
            <Text className="text-red-700">{error}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      className={`bg-white rounded-lg border border-gray-200 flex-1 ${className}`}
    >
      {/* Table */}
      <ScrollView
        horizontal
        className="flex-1"
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ minWidth: '100%' }}>
          {/* Table Header */}
          <View className="flex-row bg-gray-50 border-b border-gray-200">
            {/* Checkbox column for bulk actions */}
            {bulkActions && (
              <View
                className="p-3 border-r border-gray-200"
                style={{ width: 48, minWidth: 48, flex: 0 }}
              >
                <Pressable
                  onPress={handleSelectAll}
                  className="flex-row items-center"
                >
                  <View
                    className={`
                    w-4 h-4 border-2 rounded items-center justify-center
                    ${
                      bulkActions.isAllSelected
                        ? 'bg-blue-600 border-blue-600'
                        : bulkActions.isPartiallySelected
                          ? 'bg-blue-200 border-blue-600'
                          : 'border-gray-300'
                    }
                  `}
                  >
                    {bulkActions.isAllSelected && (
                      <Ionicons
                        name="checkmark"
                        size={12}
                        className="text-white"
                      />
                    )}
                    {bulkActions.isPartiallySelected &&
                      !bulkActions.isAllSelected && (
                        <View className="w-2 h-0.5 bg-blue-600" />
                      )}
                  </View>
                </Pressable>
              </View>
            )}

            {columns.map(column => (
              <View
                key={column.key}
                className="p-3 border-r border-gray-200"
                style={{
                  width: column.width,
                }}
              >
                {column.sortable ? (
                  <Pressable
                    onPress={() => handleHeaderClick(column)}
                    className={`flex-row items-center justify-between ${
                      loading ? 'opacity-75' : ''
                    }`}
                  >
                    <Text className="font-semibold text-gray-700 text-sm">
                      {column.label}
                    </Text>
                    <View className="flex-row items-center ml-2">
                      <Ionicons
                        name={getSortIcon(column.key as string) as any}
                        size={16}
                        className={getSortColor(column.key as string)}
                      />
                      {sorting?.config[column.key as string] && (
                        <Text className="text-xs text-blue-600 ml-1">
                          {Object.keys(sorting.config).indexOf(
                            column.key as string
                          ) + 1}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ) : (
                  <Text className="font-semibold text-gray-700 text-sm">
                    {column.label}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Table Body */}
          <View className="relative">
            {/* Loading Overlay */}
            {loading && (
              <View className="absolute inset-0 bg-white bg-opacity-75 z-10 flex items-center justify-center min-h-[200px]">
                <LoadingSpinner text="Loading data..." />
              </View>
            )}

            {data.length === 0 && !loading ? (
              <View className="p-8 items-center">
                <Ionicons
                  name="document-outline"
                  size={48}
                  className="text-gray-300 mb-3"
                />
                <Text className="text-gray-500 text-center">
                  {emptyMessage}
                </Text>
              </View>
            ) : (
              data.map((item, index) => (
                <View
                  key={item.id || index}
                  className="flex-row border-b border-gray-100 hover:bg-gray-50"
                >
                  {/* Checkbox for bulk actions */}
                  {bulkActions && (
                    <View
                      className="p-3 border-r border-gray-200"
                      style={{ width: 48, minWidth: 48, flex: 0 }}
                    >
                      <Pressable
                        onPress={() => handleSelectItem(item)}
                        className="flex-row items-center"
                      >
                        <View
                          className={`
                            w-4 h-4 border-2 rounded items-center justify-center
                            ${isItemSelected(item) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}
                          `}
                        >
                          {isItemSelected(item) && (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              className="text-white"
                            />
                          )}
                        </View>
                      </Pressable>
                    </View>
                  )}

                  {columns.map(column => (
                    <View
                      key={column.key}
                      className="p-3 border-r border-gray-200"
                      style={{
                        width: column.width,
                      }}
                    >
                      {renderCell(item, column, index)}
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Pagination */}
      {pagination && (
        <View className="p-4 border-t border-gray-200 bg-gray-50">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              {loading && (
                <View className="flex-row items-center mr-4">
                  <View className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                  <Text className="text-sm text-gray-600">Loading...</Text>
                </View>
              )}
              <Text className="text-gray-600 mr-4 text-sm">
                Showing {(pagination.currentPage - 1) * pagination.perPage + 1}{' '}
                to{' '}
                {Math.min(
                  pagination.currentPage * pagination.perPage,
                  pagination.totalItems
                )}{' '}
                of {pagination.totalItems} results
              </Text>
              <View className="flex-row items-center">
                <Text className="text-gray-600 mr-2 text-sm">Show:</Text>
                <PerPageDropdown
                  currentValue={pagination.perPage}
                  onValueChange={pagination.onPerPageChange}
                />
              </View>
            </View>

            <View className="flex-row items-center space-x-2">
              <Pressable
                onPress={() =>
                  pagination.onPageChange(pagination.currentPage - 1)
                }
                disabled={pagination.currentPage === 1}
                className={`
                  px-3 py-1 rounded flex-row items-center
                  ${
                    pagination.currentPage === 1
                      ? 'bg-gray-200'
                      : 'bg-white border border-gray-300'
                  }
                `}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  className={
                    pagination.currentPage === 1
                      ? 'text-gray-400'
                      : 'text-gray-600'
                  }
                />
                <Text
                  className={`
                  ml-1 text-sm
                  ${pagination.currentPage === 1 ? 'text-gray-400' : 'text-gray-700'}
                `}
                >
                  Previous
                </Text>
              </Pressable>

              <Text className="text-gray-600 text-sm px-2">
                Page {pagination.currentPage} of {pagination.totalPages}
              </Text>

              <Pressable
                onPress={() =>
                  pagination.onPageChange(pagination.currentPage + 1)
                }
                disabled={pagination.currentPage === pagination.totalPages}
                className={`
                  px-3 py-1 rounded flex-row items-center
                  ${
                    pagination.currentPage === pagination.totalPages
                      ? 'bg-gray-200'
                      : 'bg-white border border-gray-300'
                  }
                `}
              >
                <Text
                  className={`
                  mr-1 text-sm
                  ${pagination.currentPage === pagination.totalPages ? 'text-gray-400' : 'text-gray-700'}
                `}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  className={
                    pagination.currentPage === pagination.totalPages
                      ? 'text-gray-400'
                      : 'text-gray-600'
                  }
                />
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
