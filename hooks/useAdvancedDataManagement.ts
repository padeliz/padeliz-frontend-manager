/**
 * Advanced Data Management Hook
 * Enhanced version of useResourceData with advanced features
 */

import { useToast } from '@/context/ToastContext';
import { useResourceMetadata } from '@/hooks/useResourceMetadata';
import { ApiAdvancedPaginationParams } from '@/types/api/requests';
import { UtilFilterDefinition } from '@/types/common/filtering';
import { UtilMultiSortConfig } from '@/types/common/sorting';
import {
  UseAdvancedDataManagementOptions,
  UseAdvancedDataManagementReturn,
} from '@/types/hooks/advanced-data-management';
import { PrimaryKeyService } from '@/utils/primaryKeyService';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useAdvancedDataManagement<T extends { [key: string]: any }>({
  fetchData,
  resourceName,
  bulkDelete,
  bulkActions = [],
  initialPage = 1,
  initialPerPage = 25,
  debounceMs = 300,
}: UseAdvancedDataManagementOptions<T>): UseAdvancedDataManagementReturn<T> {
  // State
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortConfig, setSortConfig] = useState<UtilMultiSortConfig>({});
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  // Use useResourceMetadata for metadata fetching
  const { getMetadata, isLoading: metadataLoading } = useResourceMetadata([
    resourceName,
  ]);
  const metadata = getMetadata(resourceName);

  // Refs
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchDataRef = useRef(fetchData);
  const bulkDeleteRef = useRef(bulkDelete);

  // Hooks
  const { showSuccess, showError } = useToast();

  // Update refs when functions change
  useEffect(() => {
    fetchDataRef.current = fetchData;
    bulkDeleteRef.current = bulkDelete;
  }, [fetchData, bulkDelete]);
  // Load data
  const loadData = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const params: ApiAdvancedPaginationParams = {
        page: currentPage,
        per_page: perPage,
        q: searchQuery || undefined,
        sort_by: Object.keys(sortConfig).length > 0 ? sortConfig : undefined,
        filters:
          Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
      };

      const response = await fetchDataRef.current(params);

      setData(response.data);
      setTotalPages(response.meta.last_page || 1);
      setTotalItems(response.meta.total || response.data.length);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }

      setError(err.message || 'Failed to load data');
      // Don't call handleApiError here to avoid dependency issues
      // The error is already set in state and can be handled by the UI
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, searchQuery, sortConfig, activeFilters]); // Removed fetchData dependency

  // Search handlers
  const handleSearchInputChange = useCallback((input: string) => {
    setSearchInput(input);
  }, []);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput);
  }, [searchInput]);

  const handleSearchKeyPress = useCallback(
    (event: any) => {
      if (event.nativeEvent.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleSearchBlur = useCallback(() => {
    handleSearch();
  }, [handleSearch]);

  const handleSearchClear = useCallback(() => {
    setSearchInput('');
    setSearchQuery('');
  }, []);

  const handleSort = useCallback((field: string) => {
    setSortConfig(prev => {
      const currentDirection = prev[field];
      if (currentDirection === 'asc') {
        return { ...prev, [field]: 'desc' };
      } else if (currentDirection === 'desc') {
        // Remove the field if it's already desc (cycle: none -> asc -> desc -> none)
        const newConfig = { ...prev };
        delete newConfig[field];
        return newConfig;
      } else {
        // Add the field with asc direction
        return { ...prev, [field]: 'asc' };
      }
    });
  }, []);

  const handleMultiSort = useCallback(
    (field: string, direction: 'asc' | 'desc') => {
      setSortConfig(prev => ({
        ...prev,
        [field]: direction,
      }));
    },
    []
  );

  const handleFilter = useCallback((field: string, value: any) => {
    setActiveFilters(prev => {
      if (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && value.length === 0)
      ) {
        // Remove the field if value is empty
        const newFilters = { ...prev };
        delete newFilters[field];
        return newFilters;
      } else {
        // Set the field with the value
        return {
          ...prev,
          [field]: value,
        };
      }
    });
  }, []);

  const handleClearFilter = useCallback((field: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === data.length && data.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...data]);
    }
  }, [data, selectedItems.length]);

  const handleSelectItem = useCallback(
    (item: T) => {
      setSelectedItems(prev => {
        if (!metadata) {
          console.warn(
            '🔍 useAdvancedDataManagement: Metadata not available for ID extraction'
          );
          return prev;
        }

        const itemId = PrimaryKeyService.extractId(item, metadata);
        if (!itemId) {
          console.warn(
            '🔍 useAdvancedDataManagement: Could not extract ID from item:',
            item
          );
          return prev;
        }

        const isSelected = prev.some(selected => {
          const selectedId = PrimaryKeyService.extractId(selected, metadata);
          return selectedId === itemId;
        });

        if (isSelected) {
          return prev.filter(selected => {
            const selectedId = PrimaryKeyService.extractId(selected, metadata);
            return selectedId !== itemId;
          });
        } else {
          return [...prev, item];
        }
      });
    },
    [metadata]
  );

  const handleBulkAction = useCallback(
    async (action: string) => {
      if (action === 'delete' && bulkDeleteRef.current) {
        try {
          if (!metadata) {
            showError(
              'Bulk Delete Failed',
              'Metadata not available for ID extraction'
            );
            return;
          }

          const ids = selectedItems
            .map(item => PrimaryKeyService.extractId(item, metadata))
            .filter((id): id is number => Boolean(id));

          if (ids.length === 0) {
            showError(
              'Bulk Delete Failed',
              'No valid IDs found in selected items'
            );
            return;
          }

          await bulkDeleteRef.current(ids);
          showSuccess(
            'Bulk Delete',
            `Successfully deleted ${ids.length} items`
          );
          setSelectedItems([]);
          await loadData(); // Refresh data
        } catch (err: any) {
          showError(
            'Bulk Delete Failed',
            err.message || 'Failed to delete items'
          );
        }
      }
    },
    [selectedItems, showSuccess, showError, loadData] // Removed bulkDelete dependency
  );

  const handleExportData = useCallback(
    (format: 'csv' | 'json') => {
      if (format === 'json') {
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // Simple CSV export
        const headers = Object.keys(data[0] || {});
        const csvContent = [
          headers.join(','),
          ...data.map(item =>
            headers.map(header => item[header] || '').join(',')
          ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      showSuccess(
        'Export Complete',
        `Data exported as ${format.toUpperCase()}`
      );
    },
    [data, showSuccess]
  );

  // Effects
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Computed values
  const isAllSelected = selectedItems.length === data.length && data.length > 0;
  const isPartiallySelected =
    selectedItems.length > 0 && selectedItems.length < data.length;

  // Reset functionality
  const hasActiveState =
    searchQuery.length > 0 ||
    Object.keys(activeFilters).length > 0 ||
    Object.keys(sortConfig).length > 0 ||
    currentPage > 1;

  const handleReset = useCallback(() => {
    setSearchQuery('');
    setSearchInput('');
    setActiveFilters({});
    setSortConfig({});
    setCurrentPage(1);
    setSelectedItems([]);
  }, []);

  // Generate search placeholder from metadata
  const generateSearchPlaceholder = (searchableFields: string[]): string => {
    if (!searchableFields || searchableFields.length === 0) {
      return 'Search...';
    }

    // Convert field names to human-readable format
    const readableFields = searchableFields.map(field =>
      field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toLowerCase())
    );

    // Create placeholder text
    if (readableFields.length === 1) {
      return `by ${readableFields[0]}...`;
    } else if (readableFields.length === 2) {
      return `by ${readableFields[0]} or ${readableFields[1]}...`;
    } else {
      const lastField = readableFields.pop();
      return `by ${readableFields.join(', ')} or ${lastField}...`;
    }
  };

  const searchPlaceholder = metadata?.searchable_fields
    ? generateSearchPlaceholder(metadata.searchable_fields)
    : 'Search...';

  // Generate filter definitions from metadata
  const filterDefinitions: UtilFilterDefinition[] = useMemo(() => {
    if (!metadata?.filterable_fields) {
      return [];
    }

    try {
      const definitions = Object.entries(metadata.filterable_fields)
        .map(([field, definition]) => {
          // Handle different types of values
          let options = undefined;
          if (definition.values) {
            if (Array.isArray(definition.values)) {
              options = definition.values.map(value => ({
                label: String(value),
                value,
              }));
            } else if (typeof definition.values === 'object') {
              // Handle object values (like foreign key mappings)
              // For foreign keys: key = ID, value = display name
              options = Object.entries(definition.values).map(
                ([key, value]) => ({
                  label: String(value), // Display name
                  value: key, // ID value
                })
              );
            } else {
              // TODO: Handle other types of values
            }
          }

          // Skip filters without available values since all filters should be dropdowns
          if (!options || options.length === 0) {
            return null;
          }

          // Get the title from swagger_schema properties
          const propertyTitle =
            metadata.swagger_schema?.properties?.[field]?.title;
          const label =
            propertyTitle ||
            field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

          // Calculate dynamic width based on label and option values
          const calculateFilterWidth = (label: string, options: any[]) => {
            const labelWidth = label.length * 8; // Approximate character width
            const maxOptionWidth = Math.max(
              ...options.map(opt => String(opt.label).length * 8),
              labelWidth
            );
            const minWidth = 120; // Minimum width
            const maxWidth = 300; // Maximum width
            return Math.min(Math.max(maxOptionWidth + 40, minWidth), maxWidth);
          };

          const filterDef: UtilFilterDefinition = {
            field,
            label,
            type: 'multiselect',
            options,
            multiple: true,
            placeholder: '...',
            width: calculateFilterWidth(label, options),
          };

          return filterDef;
        })
        .filter((def): def is NonNullable<typeof def> => def !== null); // Remove null values

      return definitions;
    } catch (error) {
      return [];
    }
  }, [metadata]);

  return {
    // Data
    data,
    loading,
    error,

    // Pagination
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      perPage,
      onPageChange: setCurrentPage,
      onPerPageChange: newPerPage => {
        setPerPage(newPerPage);
      },
    },

    // Search
    search: {
      query: searchQuery,
      input: searchInput,
      placeholder: searchPlaceholder,
      onInputChange: handleSearchInputChange,
      onSearch: handleSearch,
      onKeyPress: handleSearchKeyPress,
      onBlur: handleSearchBlur,
      onClear: handleSearchClear,
    },

    // Sorting
    sorting: {
      config: sortConfig,
      onSort: handleSort,
      onMultiSort: handleMultiSort,
    },

    // Filtering
    filters: {
      active: activeFilters,
      definitions: filterDefinitions,
      onFilter: handleFilter,
    },

    // Reset
    reset: {
      hasActiveState,
      onReset: handleReset,
    },

    // Bulk Actions
    bulkActions: {
      selectedItems,
      onSelectAll: handleSelectAll,
      onSelectItem: handleSelectItem,
      onClearSelection: () => setSelectedItems([]),
      onBulkAction: handleBulkAction,
      isAllSelected,
      isPartiallySelected,
    },

    // Metadata
    metadata,
    metadataLoading: metadataLoading(resourceName),

    // Actions
    refresh: loadData,
    exportData: handleExportData,
  };
}
