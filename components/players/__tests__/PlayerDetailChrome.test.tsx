import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { PlayerDetailChrome } from '@/components/players/PlayerDetailChrome';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

const mockPathname = { value: '/players/42/profile-images' };

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text testID="redirect">{href}</Text>;
  },
  Slot: () => {
    const { Text } = require('react-native');
    return <Text testID="slot">slot</Text>;
  },
  usePathname: () => mockPathname.value,
  useLocalSearchParams: () => ({ id: '42' }),
})
);

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/components/events/EventTabsBar', () => {
  const { View } = require('react-native');
  return () => <View testID="event-tabs-bar" />;
});

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({
    title,
    children,
  }: {
    title?: string;
    children: React.ReactNode;
  }) => (
    <View>
      {title ? <Text testID="app-layout-title">{title}</Text> : null}
      {children}
    </View>
  );
});

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    getPlayer: async () => ({
      data: {
        id_player: 42,
        name: 'Ace Player',
      },
    }),
  })),
}));

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => ({
      display_field: 'name',
      primary_key: 'id_player',
    }),
  }),
}));

const mockUsePageChrome = jest.fn();

jest.mock('@/components/chrome/PageChromeProvider', () => {
  const actual = jest.requireActual('@/components/chrome/PageChromeProvider');
  return {
    ...actual,
    usePageChrome: () => mockUsePageChrome(),
  };
});

describe('PlayerDetailChrome', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;

  beforeEach(() => {
    mockPathname.value = '/players/42/profile-images';
    mockUsePageChrome.mockReturnValue({ actions: null });
    activeClient = createTestQueryClient();
  });

  afterEach(async () => {
    cleanup();
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  function renderChrome() {
    return render(
      <QueryClientProvider client={activeClient!}>
        <PageChromeProvider>
          <PlayerDetailChrome />
        </PageChromeProvider>
      </QueryClientProvider>
    );
  }

  it('formats Page Header title from displayTitle while Details tab is active', async () => {
    mockPathname.value = '/players/42/details';
    mockUsePageChrome.mockReturnValue({
      actions: { displayTitle: 'Ace Player' },
    });
    const { getByTestId } = renderChrome();
    await waitFor(() => {
      expect(getByTestId('app-layout-title')).toHaveTextContent(
        'Player: Ace Player'
      );
    });
    await act(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    });
  });

  it('keeps player name on non-details tabs via layout fetch', async () => {
    mockUsePageChrome.mockReturnValue({ actions: null });
    const { getByTestId } = renderChrome();
    await waitFor(() => {
      expect(getByTestId('app-layout-title')).toHaveTextContent(
        'Player: Ace Player'
      );
    });
    await act(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    });
  });
});
