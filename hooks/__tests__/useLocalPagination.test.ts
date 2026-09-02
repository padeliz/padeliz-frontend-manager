import { act, renderHook } from '@testing-library/react-native';
import { useLocalPagination } from '@/hooks/useLocalPagination';

describe('useLocalPagination', () => {
  it('defaults to 10 and slices pages', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const { result } = renderHook(() => useLocalPagination(items));
    expect(result.current.pagination.perPage).toBe(10);
    expect(result.current.pageItems).toHaveLength(10);
    expect(result.current.pagination.totalPages).toBe(2);
  });

  it('clamps page when items shrink', () => {
    let items = Array.from({ length: 30 }, (_, i) => i);
    const { result, rerender } = renderHook(
      ({ list }) => useLocalPagination(list),
      { initialProps: { list: items } }
    );
    act(() => {
      result.current.pagination.onPageChange(2);
    });
    expect(result.current.pagination.currentPage).toBe(2);

    items = Array.from({ length: 5 }, (_, i) => i);
    rerender({ list: items });
    expect(result.current.pagination.currentPage).toBe(1);
    expect(result.current.pageItems).toHaveLength(5);
  });

  it('resets to page 1 on per-page change', () => {
    const items = Array.from({ length: 40 }, (_, i) => i);
    const { result } = renderHook(() => useLocalPagination(items));
    act(() => {
      result.current.pagination.onPageChange(2);
      result.current.pagination.onPerPageChange(25);
    });
    expect(result.current.pagination.perPage).toBe(25);
    expect(result.current.pagination.currentPage).toBe(1);
  });
});
