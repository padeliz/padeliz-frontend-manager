/**
 * Linked Entity Section Component
 * Displays a paginated table for linked entities
 */

import { useAdvancedDataManagement } from '@/hooks/useAdvancedDataManagement';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { ApiResourceMetadata } from '@/types/api/metadata';
import { LinkedEntityConfig } from '@/types/ui/pages';
import { PrimaryKeyService } from '@/utils/primaryKeyService';
import {
  extractLinkedResourceSchemaNames,
  generateColumnsFromMetadata,
} from '@/utils/tableColumns';
import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import AdvancedDataTable from '../ui/AdvancedDataTable';

export interface LinkedEntitySectionProps {
  config: LinkedEntityConfig;
  parentId: number;
  title?: string;
}

export default function LinkedEntitySection({
  config,
  parentId,
  title,
}: LinkedEntitySectionProps) {
  const {
    key,
    label,
    resourceName,
    fetchData,
    columns,
    excludeFields = [],
    selectedColumns,
  } = config;

  // Stable fetch functions using useCallback
  const stableFetchData = useCallback(
    async (params: any) => {
      return await fetchData(parentId, params);
    },
    [fetchData, parentId]
  );

  // Use the advanced data management hook
  const {
    data,
    loading,
    error,
    pagination,
    metadata,
    metadataLoading,
    refresh,
  } = useAdvancedDataManagement({
    fetchData: stableFetchData,
    resourceName,
    initialPage: 1,
    initialPerPage: 10,
  });

  // Pre-fetch metadata for every linked resource referenced by a foreign key
  // in this table's schema, so FK columns can render their `display_field`.
  const linkedSchemaNames = useMemo(
    () => (metadata ? extractLinkedResourceSchemaNames(metadata) : []),
    [metadata]
  );

  const {
    getMetadata: getLinkedResourceMetadata,
    isLoading: isLinkedResourceLoading,
  } = useResourceMetadata(linkedSchemaNames);

  const linkedResourcesMetadata: Record<string, ApiResourceMetadata> = {};
  for (const schemaName of linkedSchemaNames) {
    const linkedMeta = getLinkedResourceMetadata(schemaName);
    if (linkedMeta) {
      linkedResourcesMetadata[schemaName] = linkedMeta;
    }
  }

  const allLinkedMetadataLoaded = linkedSchemaNames.every(
    name => getLinkedResourceMetadata(name) !== null
  );

  // Fingerprint of loaded linked schemas - used to retrigger column rebuild
  // when an async metadata fetch completes.
  const linkedResourcesFingerprint = Object.keys(linkedResourcesMetadata)
    .sort()
    .join('|');

  // Generate columns dynamically from metadata if not provided
  const dynamicColumns = useMemo(() => {
    if (columns !== undefined) {
      return columns;
    }

    if (metadata) {
      // Use selectedColumns if provided, otherwise use all fields
      const fieldsToExclude = selectedColumns
        ? Object.keys(metadata.swagger_schema.properties).filter(
            field => !selectedColumns.includes(field)
          )
        : excludeFields;

      const generatedColumns = generateColumnsFromMetadata(metadata, {
        excludeFields: fieldsToExclude,
        linkedResourcesMetadata,
      });

      return generatedColumns;
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    columns,
    metadata,
    excludeFields,
    selectedColumns,
    linkedResourcesFingerprint,
  ]);

  // Get primary key field from metadata
  const primaryKeyField = useMemo(() => {
    if (!metadata) return null;
    return PrimaryKeyService.detectPrimaryKey(metadata);
  }, [metadata]);

  const sectionTitle = title || label;

  const anyLinkedMetadataLoading = linkedSchemaNames.some(name =>
    isLinkedResourceLoading(name)
  );

  // Show loading state while metadata is loading, primary key is not
  // available, or any of the linked-resource metadatas hasn't loaded yet so
  // foreign-key columns aren't rendered with missing display fields.
  if (
    metadataLoading ||
    !primaryKeyField ||
    anyLinkedMetadataLoading ||
    !allLinkedMetadataLoaded
  ) {
    return (
      <View className="mb-8">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-gray-900">
            {sectionTitle}
          </Text>
          <View className="flex-row items-center">
            <View className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
            <Text className="text-sm text-gray-600">Loading...</Text>
          </View>
        </View>
        <View className="bg-white border rounded-lg p-8">
          <Text className="text-gray-500 text-center">
            Loading {label.toLowerCase()}...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-8">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-semibold text-gray-900">
          {sectionTitle}
        </Text>
        {metadataLoading && (
          <View className="flex-row items-center">
            <View className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
            <Text className="text-sm text-gray-600">Loading metadata...</Text>
          </View>
        )}
      </View>
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
          selectedItems: [],
          onSelectAll: () => {},
          onSelectItem: () => {},
          onBulkAction: () => {},
          isAllSelected: false,
          isPartiallySelected: false,
          availableActions: [],
        }}
        emptyMessage={`No ${label.toLowerCase()} found.`}
      />
    </View>
  );
}
