/**
 * @jest-environment jsdom
 */
import Sidebar, {
  managerNavigationItems,
} from '@/components/layout/Sidebar';
import { queryKeys } from '@/lib/queryClient';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetCounts = jest.fn();

jest.mock('@/services/api/eventRegistrationsApi', () => ({
  EventRegistrationsApiService: jest.fn().mockImplementation(() => ({
    getRegistrationQueueCounts: (...args: unknown[]) =>
      mockGetCounts(...args),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    usePathname: () => '/',
  })
);

function renderSidebar(counts: {
  awaiting_proof: number;
  refund_pending: number;
  abandoned_netopia: number;
}) {
  mockGetCounts.mockResolvedValue({ data: counts });
  const queryClient = createTestQueryClient();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <Sidebar currentPath="/" onNavigate={jest.fn()} />
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
}

describe('Sidebar registration queue badges', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;

  afterEach(async () => {
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  it('includes the three queue nav entries', () => {
    const hrefs = managerNavigationItems.map(i => i.href);
    expect(hrefs).toContain('/payment-proofs');
    expect(hrefs).toContain('/refunds');
    expect(hrefs).toContain('/abandoned-checkouts');
  });

  it('shows badges for non-zero counts and hides zeros', async () => {
    const { getByTestId, queryByTestId, queryClient } = renderSidebar({
      awaiting_proof: 3,
      refund_pending: 0,
      abandoned_netopia: 12,
    });
    activeClient = queryClient;

    await waitFor(() => {
      expect(getByTestId('sidebar-badge-awaiting_proof')).toHaveTextContent('3');
    });
    expect(queryByTestId('sidebar-badge-refund_pending')).toBeNull();
    expect(getByTestId('sidebar-badge-abandoned_netopia')).toHaveTextContent(
      '12'
    );
  });

  it('uses the shared registrationQueueCounts query key', () => {
    expect(queryKeys.registrationQueueCounts()).toEqual([
      'registrationQueueCounts',
    ]);
  });
});
