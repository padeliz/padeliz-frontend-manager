/**
 * Reusable Resource List Page Component
 * Generic component for displaying and managing any resource type with advanced features
 */

import { useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import AppLayout from '@/components/layout/AppLayout';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import AdvancedSearchFilters from '@/components/ui/AdvancedSearchFilters';
import { useAdvancedDataManagement } from '@/hooks/useAdvancedDataManagement';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { ApiResourceMetadata } from '@/types/api/metadata';
import { ResourceListPageProps } from '@/types/ui/pages';
import { PrimaryKeyService } from '@/utils/primaryKeyService';
import {
  extractLinkedResourceSchemaNames,
  generateColumnsFromMetadata,
} from '@/utils/tableColumns';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

export default function ResourceListPage<
  T extends { [key: string]: any } = any,
>({ config }: ResourceListPageProps<T>) {
  const router = useRouter();

  const {
    resourceName,
    resourceDisplayName,
    fetchData,
    bulkDelete,
    excludeFields = [],
    bulkActions = [],
    title,
    description,
    emptyMessage = `No ${resourceDisplayName.toLowerCase()} found. Try adjusting your search or filters.`,
    onAdd,
    onView,
    onExport,
    onBack,
    initialPage = 1,
    initialPerPage = 10,
    debounceMs = 300,
    showDebugInfo = false,
    showInstructions = false,
    embedded = false,
    mutationsDisabled = false,
  } = config;

  // Stable fetch functions using useCallback
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

  // Use the advanced data management hook
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

  // Pre-fetch metadata for every linked resource referenced by a foreign key
  // in this table's schema, so FK columns can render their `display_field`.
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

  // Fingerprint of loaded linked schemas - used to retrigger column rebuild
  // when an async metadata fetch completes.
  const linkedResourcesFingerprint = Object.keys(linkedResourcesMetadata)
    .sort()
    .join('|');

  // Generate columns dynamically from metadata
  const dynamicColumns = useMemo(() => {
    if (metadata) {
      const generatedColumns = generateColumnsFromMetadata(metadata, {
        excludeFields,
        onView,
        linkedResourcesMetadata,
      });

      return generatedColumns;
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    metadata,
    excludeFields,
    onView,
    resourceName,
    linkedResourcesFingerprint,
  ]);

  // Get primary key field from metadata
  const primaryKeyField = useMemo(() => {
    if (!metadata) return null;
    return PrimaryKeyService.detectPrimaryKey(metadata);
  }, [metadata]);

  useRegisterPageActions(
    embedded
      ? {
          refresh,
          canSave: false,
          isDirty: false,
        }
      : null
  );

  const handleBulkAction = (action: string) => {
    if (mutationsDisabled && action === 'delete') return;
    bulkActionsState.onBulkAction(action);
  };

  if (!primaryKeyField) {
    console.error('No primary key field found for metadata', metadata);
    return null;
  }

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleAdd = () => {
    if (mutationsDisabled) return;
    if (onAdd) {
      onAdd();
    }
  };

  const wrap = (children: React.ReactNode) =>
    embedded ? (
      <View className="flex-1" testID="resource-list-embedded">
        {children}
      </View>
    ) : (
      <AppLayout title={title}>{children}</AppLayout>
    );

  const handleExportAll = () => {
    if (onExport) {
      onExport('csv');
    } else {
      exportData('csv');
    }
  };

  return wrap(
    <View className="flex-1">
      {!embedded && (
        <View className="flex-row items-center p-4 border-b border-gray-200">
          <Pressable
            testID="resource-list-back"
            onPress={handleBack}
            className="mr-3 p-2"
          >
            <Ionicons name="arrow-back" size={24} className="text-gray-600" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">{title}</Text>
            {description && (
              <Text className="text-sm text-gray-600">{description}</Text>
            )}
          </View>
        </View>
      )}

        <ScrollView className="flex-1 p-4">
          {/* Header Actions */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Text className="text-lg font-semibold text-gray-900 mr-4">
                {resourceDisplayName} Management
              </Text>
              {metadataLoading && (
                <View className="flex-row items-center">
                  <View className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                  <Text className="text-sm text-gray-600">
                    Loading metadata...
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row space-x-2">
              {/* Bulk Actions */}
              {bulkActionsState.selectedItems.length > 0 && (
                <>
                  <Text className="text-blue-800 font-medium self-center">
                    {bulkActionsState.selectedItems.length === 1
                      ? '1 item selected'
                      : `${bulkActionsState.selectedItems.length} items selected`}
                  </Text>

                  {bulkActions.map(action => {
                    const deleteLocked =
                      mutationsDisabled && action.action === 'delete';
                    return (
                    <Pressable
                      key={action.action}
                      testID={
                        action.action === 'delete'
                          ? 'resource-list-delete-selected'
                          : action.action === 'export'
                            ? 'resource-list-export-selected'
                            : undefined
                      }
                      disabled={deleteLocked}
                      onPress={() => handleBulkAction(action.action)}
                      className={`
                        px-3 py-2 rounded-lg border flex-row items-center
                        ${
                          deleteLocked
                            ? 'bg-gray-300 border-gray-300'
                            : action.variant === 'danger'
                              ? 'bg-red-600 border-red-600'
                              : action.variant === 'primary'
                                ? 'bg-blue-600 border-blue-600'
                                : 'bg-gray-600 border-gray-600'
                        }
                      `}
                    >
                      <Ionicons
                        name={action.icon as any}
                        size={16}
                        className="text-white mr-1"
                      />
                      <Text className="text-white text-sm font-medium">
                        {action.label}
                      </Text>
                    </Pressable>
                    );
                  })}
                </>
              )}

              {reset.hasActiveState && (
                <Pressable
                  onPress={reset.onReset}
                  className="bg-orange-100 border border-orange-300 rounded-lg px-3 py-2 flex-row items-center"
                >
                  <Ionicons
                    name="refresh"
                    size={16}
                    className="text-orange-600 mr-1"
                  />
                  <Text className="text-orange-700 text-sm">Reset</Text>
                </Pressable>
              )}

              <Pressable
                onPress={refresh}
                className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 flex-row items-center"
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  className="text-gray-600 mr-1"
                />
                <Text className="text-gray-700 text-sm">Refresh</Text>
              </Pressable>

              <Pressable
                testID="resource-list-export"
                onPress={handleExportAll}
                className="bg-green-100 border border-green-300 rounded-lg px-3 py-2 flex-row items-center"
              >
                <Ionicons
                  name="download"
                  size={16}
                  className="text-green-600 mr-1"
                />
                <Text className="text-green-700 text-sm">Export</Text>
              </Pressable>

              {onAdd && (
                <Pressable
                  testID="resource-list-add"
                  disabled={mutationsDisabled}
                  onPress={handleAdd}
                  className={`${
                    mutationsDisabled ? 'bg-gray-300' : 'bg-blue-500'
                  } rounded-lg px-3 py-2 flex-row items-center`}
                >
                  <Ionicons name="add" size={16} className="text-white mr-1" />
                  <Text className="text-white text-sm font-medium">
                    Add {resourceDisplayName}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Search and Filters */}
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

          {/* Data Table */}
          <View className="flex-1 -mx-4">
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

          {/* Debug Information */}
          {showDebugInfo && (
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
          )}

          {/* Instructions */}
          {showInstructions && (
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
          )}
        </ScrollView>
      </View>
  );
}
