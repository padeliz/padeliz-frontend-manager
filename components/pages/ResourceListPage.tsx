/**
 * Reusable Resource List Page Component
 * Generic component for displaying and managing any resource type with advanced features
 */

import {
  useHasPageChrome,
  useRegisterPageActions,
} from '@/components/chrome/PageChromeProvider';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import AdvancedSearchFilters from '@/components/ui/AdvancedSearchFilters';
import ActionButton from '@/components/ui/ActionButton';
import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { useAdvancedDataManagement } from '@/hooks/useAdvancedDataManagement';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { ApiResourceMetadata } from '@/types/api/metadata';
import { ResourceListPageProps } from '@/types/ui/pages';
import { confirmAction } from '@/utils/confirmAction';
import { PrimaryKeyService } from '@/utils/primaryKeyService';
import {
  extractLinkedResourceSchemaNames,
  generateColumnsFromMetadata,
} from '@/utils/tableColumns';
import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import ResourceSubHeader from './ResourceSubHeader';

export default function ResourceListPage<
  T extends { [key: string]: any } = any,
>({ config }: ResourceListPageProps<T>) {
  const {
    resourceName,
    resourceDisplayName,
    fetchData,
    bulkDelete,
    excludeFields = [],
    staticColumns,
    primaryKeyField: staticPrimaryKeyField,
    bulkActions = [],
    title,
    description,
    sectionLabel,
    sectionHref,
    subHeader,
    emptyMessage = `No ${resourceDisplayName.toLowerCase()} found. Try adjusting your search or filters.`,
    onAdd,
    onView,
    onExport,
    initialPage = 1,
    initialPerPage = 10,
    debounceMs = 300,
    showDebugInfo = false,
    showInstructions = false,
    embedded = false,
    mutationsDisabled = false,
  } = config;

  const stableFetchData = useCallback(
    async (params: any) => {
      return await fetchData(params);
    },
    [fetchData, resourceName]
  );

  const stableBulkDelete = useCallback(
    async (ids: (string | number)[]) => {
      if (!bulkDelete) {
        throw new Error(`Bulk delete not implemented for ${resourceName}`);
      }
      return await bulkDelete(ids);
    },
    [bulkDelete, resourceName]
  );

  const {
    data,
    loading,
    error,
    pagination,
    search,
    sorting,
    filters,
    bulkActions: bulkActionsState,
    metadata,
    metadataLoading,
    refresh,
    exportData,
    reset,
  } = useAdvancedDataManagement<T>({
    fetchData: stableFetchData,
    resourceName,
    bulkDelete: stableBulkDelete,
    bulkActions,
    initialPage,
    initialPerPage,
    debounceMs,
  });

  const linkedSchemaNames = useMemo(
    () => (metadata ? extractLinkedResourceSchemaNames(metadata) : []),
    [metadata]
  );

  const { getMetadata: getLinkedResourceMetadata } =
    useResourceMetadata(linkedSchemaNames);

  const linkedResourcesMetadata: Record<string, ApiResourceMetadata> = {};
  for (const schemaName of linkedSchemaNames) {
    const linkedMeta = getLinkedResourceMetadata(schemaName);
    if (linkedMeta) {
      linkedResourcesMetadata[schemaName] = linkedMeta;
    }
  }

  const linkedResourcesFingerprint = Object.keys(linkedResourcesMetadata)
    .sort()
    .join('|');

  const dynamicColumns = useMemo(() => {
    if (staticColumns && staticColumns.length > 0) {
      return staticColumns;
    }
    if (metadata) {
      return generateColumnsFromMetadata(metadata, {
        excludeFields,
        onView,
        linkedResourcesMetadata,
      });
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    metadata,
    staticColumns,
    excludeFields,
    onView,
    resourceName,
    linkedResourcesFingerprint,
  ]);

  const primaryKeyField = useMemo(() => {
    if (staticPrimaryKeyField) {
      return staticPrimaryKeyField;
    }
    if (!metadata) return null;
    return PrimaryKeyService.detectPrimaryKey(metadata);
  }, [metadata, staticPrimaryKeyField]);

  useBreadcrumbSegments(`resource-list-${resourceName}`, []);

  const handleBulkAction = useCallback(
    (action: string) => {
      if (mutationsDisabled && action === 'delete') {
        return Promise.resolve();
      }
      return bulkActionsState.onBulkAction(action);
    },
    [bulkActionsState, mutationsDisabled]
  );

  const handleAdd = useCallback(() => {
    if (mutationsDisabled) return;
    onAdd?.();
  }, [mutationsDisabled, onAdd]);

  const handleExportAll = useCallback(() => {
    if (onExport) {
      onExport('csv');
    } else {
      exportData('csv');
    }
  }, [exportData, onExport]);

  const selectedCount = bulkActionsState.selectedItems.length;
  const {
    status: deleteButtonStatus,
    errorMessage: deleteErrorMessage,
    run: runDelete,
  } = useActionButtonStatus({
    successHoldMs: 4000,
    auditoryFeedback: true,
  });
  const {
    status: refreshButtonStatus,
    errorMessage: refreshErrorMessage,
    run: runRefresh,
  } = useActionButtonStatus({
    successHoldMs: 4000,
  });

  const hasPageChrome = useHasPageChrome();
  const chromeOwnsRefresh = embedded && hasPageChrome;

  const headerActions = useMemo(
    () => (
      <>
        {selectedCount > 0 ? (
          <>
            <Text className="text-blue-800 font-medium self-center mr-1">
              {selectedCount === 1
                ? '1 item selected'
                : `${selectedCount} items selected`}
            </Text>
            {bulkActions.map(action => {
              const deleteLocked =
                mutationsDisabled && action.action === 'delete';
              const variant =
                action.variant === 'danger'
                  ? 'danger'
                  : action.variant === 'primary'
                    ? 'primary'
                    : 'ghost';
              return (
                <ActionButton
                  key={action.action}
                  label={action.label}
                  startIcon={action.icon as any}
                  variant={variant}
                  disabled={deleteLocked}
                  status={
                    action.action === 'delete'
                      ? deleteButtonStatus
                      : 'idle'
                  }
                  errorMessage={
                    action.action === 'delete'
                      ? deleteErrorMessage ?? undefined
                      : undefined
                  }
                  onPress={() => {
                    if (action.action === 'delete') {
                      if (deleteLocked) return;
                      const message =
                        action.confirmMessage ??
                        'Are you sure you want to delete the selected items?';
                      confirmAction('Delete Selected', message, () => {
                        void runDelete(() =>
                          handleBulkAction(action.action)
                        );
                      });
                      return;
                    }
                    void handleBulkAction(action.action);
                  }}
                  testID={
                    action.action === 'delete'
                      ? 'resource-list-delete-selected'
                      : action.action === 'export'
                        ? 'resource-list-export-selected'
                        : undefined
                  }
                />
              );
            })}
          </>
        ) : null}

        {reset.hasActiveState ? (
          <ActionButton
            label="Reset"
            startIcon="refresh"
            variant="warning"
            onPress={reset.onReset}
            testID="resource-list-reset"
          />
        ) : null}

        {chromeOwnsRefresh ? null : (
          <ActionButton
            label="Refresh"
            startIcon="refresh"
            pendingAppearance="spinIcon"
            status={refreshButtonStatus}
            errorMessage={refreshErrorMessage ?? undefined}
            onPress={() => {
              void runRefresh(refresh);
            }}
            testID="resource-list-refresh"
          />
        )}

        <ActionButton
          label="Export"
          startIcon="download"
          variant="success"
          onPress={handleExportAll}
          testID="resource-list-export"
        />

        {onAdd ? (
          <ActionButton
            label={`Add ${resourceDisplayName}`}
            startIcon="add"
            variant="primary"
            disabled={mutationsDisabled}
            onPress={handleAdd}
            testID="resource-list-add"
          />
        ) : null}
      </>
    ),
    [
      bulkActions,
      chromeOwnsRefresh,
      deleteButtonStatus,
      deleteErrorMessage,
      handleAdd,
      handleBulkAction,
      handleExportAll,
      mutationsDisabled,
      onAdd,
      refresh,
      refreshButtonStatus,
      refreshErrorMessage,
      reset.hasActiveState,
      reset.onReset,
      resourceDisplayName,
      runDelete,
      runRefresh,
      selectedCount,
    ]
  );

  const headerActionsKey = `${selectedCount}-${mutationsDisabled ? 1 : 0}`;

  useRegisterPageActions(
    embedded
      ? {
          refresh,
          canSave: false,
          isDirty: false,
          headerActions,
          headerActionsKey,
        }
      : null
  );

  const wrap = (children: React.ReactNode) =>
    embedded ? (
      <View className="flex-1" testID="resource-list-embedded">
        {children}
      </View>
    ) : (
      <AppLayout
        title={title}
        description={description}
        headerActions={headerActions}
      >
        {children}
      </AppLayout>
    );

  if (metadata && !metadataLoading && !metadata.swagger_schema?.properties) {
    return wrap(
      <View className="flex-1 justify-center items-center p-6">
        <Text
          testID="resource-list-schema-error"
          className="text-red-800 text-center"
        >
          Resource metadata is unavailable for {resourceDisplayName}. Try
          refreshing the page.
        </Text>
      </View>
    );
  }

  if (!primaryKeyField) {
    if (!staticColumns?.length && (metadataLoading || !metadata)) {
      return wrap(
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-gray-600 text-center">Loading...</Text>
        </View>
      );
    }
    console.error('No primary key field found for metadata', metadata);
    return wrap(
      <View className="flex-1 justify-center items-center p-6">
        <Text
          testID="resource-list-schema-error"
          className="text-red-800 text-center"
        >
          Resource metadata is unavailable for {resourceDisplayName}. Try
          refreshing the page.
        </Text>
      </View>
    );
  }

  return wrap(
    <View className="flex-1">
      {subHeader ? (
        <ResourceSubHeader
          title={subHeader.title}
          description={subHeader.description}
          actions={subHeader.actions}
        />
      ) : null}

      <View className="flex-1 p-4">
        {metadataLoading ? (
          <View className="flex-row items-center mb-4">
            <View className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
            <Text className="text-sm text-gray-600">Loading metadata...</Text>
          </View>
        ) : null}

        <AdvancedSearchFilters
          searchQuery={search.query}
          searchInput={search.input}
          searchPlaceholder={search.placeholder}
          onInputChange={search.onInputChange}
          onSearch={search.onSearch}
          onKeyPress={search.onKeyPress}
          onBlur={search.onBlur}
          onClear={search.onClear}
          activeFilters={filters.active}
          filterDefinitions={filters.definitions}
          onFilter={filters.onFilter}
        />

        <View className="flex-1 -mx-4 mt-4">
          <AdvancedDataTable
            data={data}
            columns={dynamicColumns}
            primaryKeyField={primaryKeyField}
            loading={loading}
            error={error}
            pagination={{
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
              totalItems: pagination.totalItems,
              perPage: pagination.perPage,
              onPageChange: pagination.onPageChange,
              onPerPageChange: pagination.onPerPageChange,
            }}
            bulkActions={{
              selectedItems: bulkActionsState.selectedItems,
              onSelectAll: bulkActionsState.onSelectAll,
              onSelectItem: bulkActionsState.onSelectItem,
              onBulkAction: handleBulkAction,
              isAllSelected: bulkActionsState.isAllSelected,
              isPartiallySelected: bulkActionsState.isPartiallySelected,
              availableActions: bulkActions,
            }}
            sorting={{
              config: sorting.config,
              onSort: sorting.onSort,
              onMultiSort: sorting.onMultiSort,
            }}
            emptyMessage={emptyMessage}
          />
        </View>

        {showDebugInfo ? (
          <View className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <Text className="text-sm font-semibold text-gray-900 mb-2">
              Debug Information:
            </Text>
            <View className="space-y-1">
              <Text className="text-xs text-gray-600">
                <Text className="font-medium">Resource:</Text> {resourceName}
              </Text>
              <Text className="text-xs text-gray-600">
                <Text className="font-medium">Data Count:</Text> {data.length}
              </Text>
              <Text className="text-xs text-gray-600">
                <Text className="font-medium">Loading:</Text>{' '}
                {loading ? 'Yes' : 'No'}
              </Text>
              <Text className="text-xs text-gray-600">
                <Text className="font-medium">Error:</Text> {error || 'None'}
              </Text>
              <Text className="text-xs text-gray-600">
                <Text className="font-medium">Search Query:</Text>{' '}
                {search.query || 'None'}
              </Text>
              <Text className="text-xs text-gray-600">
                <Text className="font-medium">Sort:</Text>{' '}
                {Object.keys(sorting.config).length > 0
                  ? Object.entries(sorting.config)
                      .map(([field, direction]) => `${field} (${direction})`)
                      .join(', ')
                  : 'None'}
              </Text>
              <Text className="text-xs text-gray-600">
                <Text className="font-medium">Active Filters:</Text>{' '}
                {Object.keys(filters.active).length}
              </Text>
              <Text className="text-xs text-gray-600">
                <Text className="font-medium">Selected Items:</Text>{' '}
                {bulkActionsState.selectedItems.length}
              </Text>
              <Text className="text-xs text-gray-600">
                <Text className="font-medium">Metadata:</Text>{' '}
                {metadata ? 'Loaded' : 'Not loaded'}
              </Text>
            </View>
          </View>
        ) : null}

        {showInstructions ? (
          <View className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Text className="text-sm text-blue-800">
              <Text className="font-semibold">Instructions:</Text>
              {'\n'}• Use the search bar to find{' '}
              {resourceDisplayName.toLowerCase()}
              {'\n'}• Click column headers to sort by different fields
              {'\n'}• Use filters to narrow down results
              {'\n'}• Select items using checkboxes for bulk actions
              {'\n'}• Use pagination controls to navigate through pages
              {'\n'}• Export data in CSV or JSON format
              {'\n'}• Check console logs for detailed debug information
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
