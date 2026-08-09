import { UtilSortConfig } from '@/types/common/sorting';
import {
  UseResourceDataOptions,
  UseResourceDataReturn,
} from '@/types/hooks/resource-data';
import { useCallback, useEffect, useState } from 'react';

export function useResourceData<
  T extends { [key: string]: any },
>({
  fetchData,
  initialPage = 1,
  initialPerPage = 25,
}: UseResourceDataOptions<T>): UseResourceDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<UtilSortConfig>({
    field: '',
    direction: 'asc',
  });
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchData({
        page: currentPage,
        perPage,
        search: searchQuery || undefined,
        sortBy: sortConfig.field || undefined,
        sortDirection: sortConfig.direction,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });

      setData(response.data);

      // Update pagination from meta
      if (response.meta) {
        setTotalPages(response.meta.last_page || 1);
        setTotalItems(response.meta.total || response.data.length);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading resource data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchData, currentPage, perPage, searchQuery, sortConfig, filters]);

  // Load data when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to first page when search, sort, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig.field, sortConfig.direction, filters]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev: UtilSortConfig) => ({
      field: key,
      direction:
        prev.field === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === data.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...data]);
    }
  }, [data, selectedItems.length]);

  const handleSelectItem = useCallback((item: T) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected.id === item.id);
      if (isSelected) {
        return prev.filter(selected => selected.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const handleBulkDelete = useCallback(() => {
    // This should be implemented by the parent component
    // The hook just provides the selected items
  }, [selectedItems]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const updateFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters);
  }, []);

  return {
    data,
    loading,
    error,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      perPage,
    },
    search: {
      query: searchQuery,
      onSearch: handleSearch,
    },
    sorting: {
      config: sortConfig,
      onSort: handleSort,
    },
    bulkActions: {
      selectedItems,
      onSelectAll: handleSelectAll,
      onSelectItem: handleSelectItem,
      onClearSelection: handleClearSelection,
      onBulkDelete: handleBulkDelete,
    },
    refresh,
    setFilters: updateFilters,
  };
}
