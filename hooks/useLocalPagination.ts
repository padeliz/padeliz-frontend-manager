import { useMemo, useState } from 'react';

export type LocalPaginationState = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export function useLocalPagination<T>(
  items: T[],
  options?: { defaultPerPage?: number }
): { pageItems: T[]; pagination: LocalPaginationState } {
  const defaultPerPage = options?.defaultPerPage ?? 15;
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage) || 1);
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, currentPage, perPage]);

  return {
    pageItems,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      perPage,
      onPageChange: setPage,
      onPerPageChange: next => {
        setPerPage(next);
        setPage(1);
      },
    },
  };
}
