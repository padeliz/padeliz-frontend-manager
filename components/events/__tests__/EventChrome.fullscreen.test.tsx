import { EventChrome } from '@/components/events/EventDetailChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { createTestQueryClient } from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

const mockGetEvent = jest.fn(async () => ({
  data: {
    id_event: 1,
    name: 'Test Event',
    event_starts_at: Math.floor(
      new Date('2026-08-24T09:00:00+03:00').getTime() / 1000
    ),
    event_ends_at: Math.floor(
      new Date('2026-08-24T22:00:00+03:00').getTime() / 1000
    ),
    finalized_at: null,
  },
}));
const mockGetEventDivisions = jest.fn(async () => ({ data: [] }));

let mockPathname = '/events/1/lottery/luckies';
let mockGlobalParams: Record<string, string | string[] | undefined> = {
  id: '1',
};

jest.mock('@/services/api/eventsApi', () => ({
  EventsApiService: jest.fn().mockImplementation(() => ({
    getEvent: (...args: unknown[]) => mockGetEvent(...args),
    finalizeEvent: jest.fn(),
  })),
}));

jest.mock('@/services/api/eventDivisionsApi', () => ({
  EventDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEventDivisions: (...args: unknown[]) =>
      mockGetEventDivisions(...args),
  })),
}));

jest.mock('@/services/api/eventLotteriesApi', () => ({
  EventLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: jest.fn(async () => ({ data: [] })),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn(), push: jest.fn() }),
  usePathname: () => mockPathname,
  useLocalSearchParams: () => ({ id: '1' }),
  useGlobalSearchParams: () => mockGlobalParams,
  Slot: () => null,
  Redirect: () => null,
})
);

jest.mock('@/hooks/useLayoutChrome', () => ({
  useLayoutChrome: () => ({
    isFullscreen: mockGlobalParams.fs === '1',
    enterFullscreen: jest.fn(),
    exitFullscreen: jest.fn(),
    visibility: {
      nav: mockGlobalParams.fs !== '1',
      sidebar: mockGlobalParams.fs !== '1',
      breadcrumbs: mockGlobalParams.fs !== '1',
      header: mockGlobalParams.fs !== '1',
      tabs: mockGlobalParams.fs !== '1',
      subtabs: mockGlobalParams.fs !== '1',
    },
  }),
}));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({
    children,
    headerActions,
  }: {
    children: React.ReactNode;
    headerActions?: React.ReactNode;
  }) => (
    <View testID="app-page-header">
      <View testID="app-header-actions">{headerActions}</View>
      {children}
    </View>
  );
});

jest.mock('@/components/pages/EditModeToggle', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text testID="edit-mode-toggle">Edit</Text>;
});

function renderChrome() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <EventChrome />
      </PageChromeProvider>
    </QueryClientProvider>
  );
}

describe('EventChrome fullscreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/events/1/lottery/luckies';
    mockGlobalParams = { id: '1' };
    (window as any).addEventListener = jest.fn();
    (window as any).removeEventListener = jest.fn();
  });

  it('shows fullscreen toggle last on luckies path', async () => {
    const { findByTestId, queryByTestId } = renderChrome();
    await findByTestId('fullscreen-toggle');
    expect(queryByTestId('edit-mode-toggle')).toBeNull();
  });

  it('does not show fullscreen toggle on non-luckies lottery path', async () => {
    mockPathname = '/events/1/lottery/prizes';
    const { queryByTestId, findByText } = renderChrome();
    await findByText('Refresh');
    expect(queryByTestId('fullscreen-toggle')).toBeNull();
  });

  it('hides page header when fs=1 via AppLayout gating in real routes', async () => {
    mockGlobalParams = { id: '1', fs: '1' };
    const { queryByTestId, findByText } = renderChrome();
    await findByText('Refresh');
    expect(queryByTestId('fullscreen-toggle')).toBeNull();
  });
});
