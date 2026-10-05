/**
 * @jest-environment jsdom
 *
 * Queue-scoped lists must not share React Query cache with sibling queues.
 */
import { ToastProvider } from '@/context/ToastContext';
import { useAdvancedDataManagement } from '@/hooks/useAdvancedDataManagement';
import { queryKeys } from '@/lib/queryClient';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => ({
      filterable_fields: {},
      searchable_fields: [],
      swagger_schema: { properties: {} },
    }),
    isLoading: () => false,
  }),
}));

describe('useAdvancedDataManagement extraListParams', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  afterEach(async () => {
    await disposeTestQueryClient(queryClient);
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
  }

  it('keeps abandoned queue cache separate from an empty awaiting_proof list', async () => {
    const fetchAwaiting = jest.fn(async () => ({
      data: [],
      meta: { total: 0, last_page: 1 },
      links: {},
    }));
    const fetchAbandoned = jest.fn(async () => ({
      data: [{ id_checkout: 2139 }],
      meta: { total: 1, last_page: 1 },
      links: {},
    }));

    const { result: awaiting, unmount: unmountAwaiting } = renderHook(
      () =>
        useAdvancedDataManagement({
          resourceName: 'EventRegistrationCheckout',
          fetchData: fetchAwaiting,
          initialPerPage: 10,
          extraListParams: { queue: 'awaiting_proof' },
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(fetchAwaiting).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(awaiting.current.data).toEqual([]);
    });

    expect(
      queryClient.getQueryData(
        queryKeys.resourceList('EventRegistrationCheckout', {
          page: 1,
          per_page: 10,
          q: undefined,
          sort_by: undefined,
          filters: undefined,
          queue: 'awaiting_proof',
        })
      )
    ).toBeTruthy();

    unmountAwaiting();

    const { result: abandoned } = renderHook(
      () =>
        useAdvancedDataManagement({
          resourceName: 'EventRegistrationCheckout',
          fetchData: fetchAbandoned,
          initialPerPage: 10,
          extraListParams: { queue: 'abandoned_netopia' },
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(fetchAbandoned).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(abandoned.current.data).toEqual([{ id_checkout: 2139 }]);
    });

    expect(fetchAbandoned).toHaveBeenCalledWith(
      expect.objectContaining({ queue: 'abandoned_netopia' })
    );
    expect(abandoned.current.data).not.toEqual([]);
  });
});
