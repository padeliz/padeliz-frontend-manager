/**
 * @jest-environment jsdom
 */
import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import ResourceListPage from '@/components/pages/ResourceListPage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const mockList = {
  selectedItems: [] as any[],
  refresh: jest.fn(),
  onBulkAction: jest.fn(),
  exportData: jest.fn(),
};

jest.mock('@/hooks/useAdvancedDataManagement', () => ({
  useAdvancedDataManagement: () => ({
    data: [{ id: 1, name: 'Row' }],
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
      selectedItems: mockList.selectedItems,
      onSelectAll: jest.fn(),
      onSelectItem: jest.fn(),
      onClearSelection: jest.fn(),
      onBulkAction: mockList.onBulkAction,
      isAllSelected: false,
      isPartiallySelected: false,
    },
    metadata: {
      swagger_schema: {
        properties: {
          id: { type: 'integer', format: 'int64', readOnly: true },
          name: { type: 'string' },
        },
      },
    },
    metadataLoading: false,
    refresh: mockList.refresh,
    exportData: mockList.exportData,
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

jest.mock('@/utils/tableColumns', () => ({
  extractLinkedResourceSchemaNames: () => [],
  generateColumnsFromMetadata: () => [
    { key: 'name', label: 'Name', width: 120 },
  ],
}));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, title, description, headerActions }: any) => (
      <View testID="app-layout">
        <Text testID="app-layout-title">{title}</Text>
        {description ? <Text testID="app-layout-description">{description}</Text> : null}
        {headerActions ? (
          <View testID="app-header-actions">{headerActions}</View>
        ) : null}
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/ui/AdvancedDataTable', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: () => (
      <View testID="advanced-data-table">
        <Text>table</Text>
      </View>
    ),
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

const baseConfig = {
  resourceName: 'Widget',
  resourceDisplayName: 'Widget',
  fetchData: jest.fn(),
  title: 'Widgets',
  onAdd: jest.fn(),
  bulkActions: [
    { label: 'Delete Selected', action: 'delete', variant: 'danger' as const },
    { label: 'Export Selected', action: 'export', variant: 'primary' as const },
  ],
};

function ChromeProbe() {
  const { actions } = usePageChrome();
  return (
    <View>
      <Text testID="chrome-has-refresh">{actions?.refresh ? 'yes' : 'no'}</Text>
      <Text testID="chrome-can-save">{actions?.canSave ? 'yes' : 'no'}</Text>
      <View testID="chrome-header-actions">{actions?.headerActions}</View>
      <Pressable
        testID="chrome-refresh"
        onPress={() => void actions?.refresh?.()}
      />
    </View>
  );
}

describe('ResourceListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.selectedItems = [];
    mockList.onBulkAction.mockResolvedValue(undefined);
    mockList.refresh.mockResolvedValue(undefined);
  });

  it('standalone: actions in Page Header, no back button, no Management label', () => {
    const { getByTestId, queryByTestId, queryByText } = render(
      <ResourceListPage config={baseConfig} />
    );
    expect(getByTestId('app-layout')).toBeTruthy();
    expect(getByTestId('app-header-actions')).toBeTruthy();
    expect(getByTestId('resource-list-add')).toBeTruthy();
    expect(getByTestId('resource-list-export')).toBeTruthy();
    expect(getByTestId('resource-list-refresh')).toBeTruthy();
    expect(queryByTestId('resource-list-back')).toBeNull();
    expect(queryByTestId('resource-list-embedded')).toBeNull();
    expect(queryByText('Widget Management')).toBeNull();
  });

  it('omits AppLayout when embedded and registers chrome headerActions', async () => {
    const { getByTestId, queryByTestId } = render(
      <PageChromeProvider>
        <ChromeProbe />
        <ResourceListPage config={{ ...baseConfig, embedded: true }} />
      </PageChromeProvider>
    );
    expect(queryByTestId('app-layout')).toBeNull();
    expect(queryByTestId('resource-list-back')).toBeNull();
    expect(getByTestId('resource-list-embedded')).toBeTruthy();

    await waitFor(() => {
      expect(getByTestId('chrome-has-refresh')).toHaveTextContent('yes');
      expect(getByTestId('resource-list-add')).toBeTruthy();
      expect(getByTestId('resource-list-export')).toBeTruthy();
    });
    // Parent chrome owns Refresh — do not also emit resource-list-refresh.
    expect(queryByTestId('resource-list-refresh')).toBeNull();
  });

  it('chromeOwnsRefresh only when embedded under PageChromeProvider', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../ResourceListPage.tsx'),
      'utf8'
    );
    expect(src).toContain('useHasPageChrome');
    expect(src).toContain('chromeOwnsRefresh = embedded && hasPageChrome');
    expect(src).toContain('chromeOwnsRefresh ? null : (');
  });

  it('keeps Add and Delete Selected visible but non-pressable when mutationsDisabled', () => {
    mockList.selectedItems = [{ id: 1, name: 'Row' }];
    const onAdd = jest.fn();
    const { getByTestId } = render(
      <ResourceListPage
        config={{ ...baseConfig, onAdd, mutationsDisabled: true }}
      />
    );
    expect(getByTestId('resource-list-add')).toBeTruthy();
    fireEvent.press(getByTestId('resource-list-add'));
    expect(onAdd).not.toHaveBeenCalled();

    expect(getByTestId('resource-list-delete-selected')).toBeTruthy();
    fireEvent.press(getByTestId('resource-list-delete-selected'));
    expect(mockList.onBulkAction).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('resource-list-export'));
    expect(mockList.exportData).toHaveBeenCalledWith('csv');

    fireEvent.press(getByTestId('resource-list-export-selected'));
    expect(mockList.onBulkAction).toHaveBeenCalledWith('export');
  });

  it('cancel confirm does not call onBulkAction', () => {
    mockList.selectedItems = [{ id: 1, name: 'Row' }];
    (window as any).confirm = jest.fn(() => false);
    const { getByTestId, queryByTestId } = render(
      <ResourceListPage config={baseConfig} />
    );
    fireEvent.press(getByTestId('resource-list-delete-selected'));
    expect((window as any).confirm).toHaveBeenCalled();
    expect(mockList.onBulkAction).not.toHaveBeenCalled();
    expect(queryByTestId('resource-list-delete-selected-pending')).toBeNull();
  });

  it('shows pending then error when bulk delete rejects', async () => {
    mockList.selectedItems = [{ id: 1, name: 'Row' }];
    (window as any).confirm = jest.fn(() => true);
    let rejectDelete!: (error: Error) => void;
    mockList.onBulkAction.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectDelete = reject;
        })
    );

    const { getByTestId } = render(
      <ResourceListPage config={baseConfig} />
    );
    fireEvent.press(getByTestId('resource-list-delete-selected'));

    await waitFor(() => {
      expect(
        getByTestId('resource-list-delete-selected-pending')
      ).toBeTruthy();
    });
    await act(async () => {
      rejectDelete(new Error('Delete failed'));
    });
    await waitFor(() => {
      expect(getByTestId('resource-list-delete-selected-error')).toBeTruthy();
    });
  });

  it('refresh pending uses spinIcon without ActivityIndicator', async () => {
    let resolveRefresh!: () => void;
    mockList.refresh.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveRefresh = resolve;
        })
    );
    const { getByTestId, queryByTestId } = render(
      <ResourceListPage config={baseConfig} />
    );
    fireEvent.press(getByTestId('resource-list-refresh'));
    await waitFor(() => {
      expect(getByTestId('resource-list-refresh-pending-spin')).toBeTruthy();
    });
    expect(queryByTestId('resource-list-refresh-pending')).toBeNull();
    await act(async () => {
      resolveRefresh();
    });
  });

  it('registers chrome refresh when embedded and clears it on unmount', async () => {
    function Harness({ showList }: { showList: boolean }) {
      return (
        <PageChromeProvider>
          <ChromeProbe />
          {showList ? (
            <ResourceListPage config={{ ...baseConfig, embedded: true }} />
          ) : null}
        </PageChromeProvider>
      );
    }

    const { getByTestId, rerender } = render(<Harness showList />);
    await waitFor(() => {
      expect(getByTestId('chrome-has-refresh')).toHaveTextContent('yes');
    });
    expect(getByTestId('chrome-can-save')).toHaveTextContent('no');

    fireEvent.press(getByTestId('chrome-refresh'));
    expect(mockList.refresh).toHaveBeenCalled();

    rerender(<Harness showList={false} />);
    await waitFor(() => {
      expect(getByTestId('chrome-has-refresh')).toHaveTextContent('no');
    });
  });
});
