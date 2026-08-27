import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import SingleSelectDropdown from './SingleSelectDropdown';

export type TablePaginationVariant = 'full' | 'navigation';

export type TablePaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
  variant?: TablePaginationVariant;
  hideWhenSinglePage?: boolean;
};

function PerPageDropdown({
  currentValue,
  onValueChange,
  options,
}: {
  currentValue: number;
  onValueChange: (value: number) => void;
  options: number[];
}) {
  return (
    <SingleSelectDropdown
      options={options.map(value => ({
        label: String(value),
        value,
      }))}
      selectedValue={currentValue}
      onSelectionChange={value => onValueChange(value as number)}
      placeholder="Select items per page"
      title="Items per page"
      minWidth={120}
      defaultValue={options[0] ?? 10}
    />
  );
}

function PaginationNav({
  currentPage,
  safeTotalPages,
  onPageChange,
  layout,
}: {
  currentPage: number;
  safeTotalPages: number;
  onPageChange: (page: number) => void;
  layout: 'inline' | 'zones';
}) {
  const previousButton = (
    <Pressable
      testID="pagination-previous"
      onPress={() => onPageChange(currentPage - 1)}
      disabled={currentPage <= 1}
      className={`
        px-3 py-1 rounded flex-row items-center
        ${
          currentPage <= 1
            ? 'bg-gray-200'
            : 'bg-white border border-gray-300'
        }
      `}
    >
      <Ionicons
        name="chevron-back"
        size={16}
        color={currentPage <= 1 ? '#9ca3af' : '#4b5563'}
      />
      <Text
        className={`ml-1 text-sm ${
          currentPage <= 1 ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        Previous
      </Text>
    </Pressable>
  );

  const pageLabel = (
    <Text
      testID="pagination-page"
      className="text-gray-600 text-sm px-2"
    >
      Page {currentPage} of {safeTotalPages}
    </Text>
  );

  const nextButton = (
    <Pressable
      testID="pagination-next"
      onPress={() => onPageChange(currentPage + 1)}
      disabled={currentPage >= safeTotalPages}
      className={`
        px-3 py-1 rounded flex-row items-center
        ${
          currentPage >= safeTotalPages
            ? 'bg-gray-200'
            : 'bg-white border border-gray-300'
        }
      `}
    >
      <Text
        className={`mr-1 text-sm ${
          currentPage >= safeTotalPages
            ? 'text-gray-400'
            : 'text-gray-700'
        }`}
      >
        Next
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={currentPage >= safeTotalPages ? '#9ca3af' : '#4b5563'}
      />
    </Pressable>
  );

  if (layout === 'zones') {
    return (
      <View className="flex-row items-center w-full">
        <View className="flex-1 items-start">{previousButton}</View>
        <View className="flex-1 items-center">{pageLabel}</View>
        <View className="flex-1 items-end">{nextButton}</View>
      </View>
    );
  }

  return (
    <View className="flex-row items-center space-x-2">
      {previousButton}
      {pageLabel}
      {nextButton}
    </View>
  );
}

export default function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  loading = false,
  variant = 'full',
  hideWhenSinglePage = false,
}: TablePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);

  if (hideWhenSinglePage && safeTotalPages <= 1) {
    return null;
  }

  const from =
    totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, totalItems);

  if (variant === 'navigation') {
    return (
      <View className="p-4 border-t border-gray-200 bg-gray-50">
        <PaginationNav
          currentPage={currentPage}
          safeTotalPages={safeTotalPages}
          onPageChange={onPageChange}
          layout="zones"
        />
      </View>
    );
  }

  return (
    <View className="p-4 border-t border-gray-200 bg-gray-50">
      <View className="flex-row items-center justify-between flex-wrap gap-2">
        <View className="flex-row items-center flex-wrap">
          {loading ? (
            <View className="flex-row items-center mr-4">
              <View className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
              <Text className="text-sm text-gray-600">Loading...</Text>
            </View>
          ) : null}
          <Text className="text-gray-600 mr-4 text-sm">
            Showing {from} to {to} of {totalItems} results
          </Text>
          <View className="flex-row items-center">
            <Text className="text-gray-600 mr-2 text-sm">Show:</Text>
            <PerPageDropdown
              currentValue={perPage}
              onValueChange={onPerPageChange}
              options={pageSizeOptions}
            />
          </View>
        </View>

        <PaginationNav
          currentPage={currentPage}
          safeTotalPages={safeTotalPages}
          onPageChange={onPageChange}
          layout="inline"
        />
      </View>
    </View>
  );
}
