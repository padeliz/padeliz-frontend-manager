/**
 * @jest-environment jsdom
 */
import ResourceListPage from '@/components/pages/ResourceListPage';
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/hooks/useAdvancedDataManagement', () => ({
  useAdvancedDataManagement: () => ({
    data: [{ id_player_profile_image_import: 1, original_filename: 'batch.zip' }],
    loading: false,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 1,
      perPage: 10,
      onPageChange: jest.fn(),
      onPerPageChange: jest.fn(),
    },
    search: {
      query: '',
      input: '',
      placeholder: 'Search',
      onInputChange: jest.fn(),
      onSearch: jest.fn(),
      onKeyPress: jest.fn(),
      onBlur: jest.fn(),
      onClear: jest.fn(),
    },
    sorting: { config: {}, onSort: jest.fn(), onMultiSort: jest.fn() },
    filters: { active: {}, definitions: [], onFilter: jest.fn() },
    bulkActions: {
      selectedItems: [],
      onSelectAll: jest.fn(),
      onSelectItem: jest.fn(),
      onClearSelection: jest.fn(),
      onBulkAction: jest.fn(),
      isAllSelected: false,
      isPartiallySelected: false,
    },
    metadata: {
      version: 'v1',
      schema_name: 'PlayerProfileImageImport',
      display_field: 'original_filename',
      searchable_fields: [],
      filterable_fields: {},
      sortable_fields: [],
      request_body: {},
      swagger_schema: null,
    },
    metadataLoading: false,
    refresh: jest.fn(),
    exportData: jest.fn(),
    reset: { hasActiveState: false, onReset: jest.fn() },
  }),
}));

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => null,
    getError: () => null,
    isLoading: () => false,
    fetchMetadata: jest.fn(),
  }),
}));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('@/components/ui/AdvancedDataTable', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="advanced-data-table" />,
  };
});

jest.mock('@/components/ui/AdvancedSearchFilters', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="search-filters" />,
  };
});

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
})
);

describe('ResourceListPage schema guard', () => {
  it('shows an inline error when metadata loads without swagger_schema', () => {
    const { getByTestId } = render(
      <ResourceListPage
        config={{
          resourceName: 'PlayerProfileImageImport',
          resourceDisplayName: 'Profile Image Import',
          fetchData: jest.fn(),
          title: 'Imports',
          embedded: true,
        }}
      />
    );

    expect(getByTestId('resource-list-schema-error')).toBeTruthy();
  });
});
