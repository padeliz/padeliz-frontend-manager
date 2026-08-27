import PlayersHubIndex from '@/app/(app)/players/(hub)/index';
import { PageChromeProvider, useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import { PlayersChrome } from '@/components/players/PlayersChrome';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

const mockPush = jest.fn();
const pathnameState = { value: '/players/list' };

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text testID="players-redirect">{href}</Text>;
  },
  Slot: () => {
    const { Text } = require('react-native');
    return <Text testID="players-slot">slot</Text>;
  },
  usePathname: () => pathnameState.value,
  useRouter: () => ({ push: mockPush }),
})
);

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({
    children,
    title,
    headerActions,
    belowHeader,
    tabBar,
  }: {
    children: React.ReactNode;
    title?: string;
    headerActions?: React.ReactNode;
    belowHeader?: React.ReactNode;
    tabBar?: React.ReactNode;
  }) => (
    <View testID="app-layout">
      {title ? <Text>{title}</Text> : null}
      {headerActions}
      {tabBar ?? belowHeader}
      {children}
    </View>
  );
});

const mockConfirm = jest.fn(async () => true);
jest.mock('@/utils/softDirtyNav', () => ({
  confirmDiscardDirty: () => mockConfirm(),
}));

jest.mock('@/components/layout/BreadcrumbProvider', () => ({
  useBreadcrumbSegments: jest.fn(),
}));

describe('Players hub', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockConfirm.mockResolvedValue(true);
    pathnameState.value = '/players/list';
  });

  it('redirects /players to /players/list', () => {
    const { getByTestId } = render(<PlayersHubIndex />);
    expect(getByTestId('players-redirect')).toHaveTextContent('/players/list');
  });

  it('renders List, Import Players, Import Profile Images, and Import Custom Field Values tabs', () => {
    const { getByTestId, queryByTestId } = render(
      <PageChromeProvider>
        <PlayersChrome />
      </PageChromeProvider>
    );
    expect(getByTestId('edition-tab-List')).toBeTruthy();
    expect(getByTestId('edition-tab-Import Players')).toBeTruthy();
    expect(getByTestId('edition-tab-Import Profile Images')).toBeTruthy();
    expect(getByTestId('edition-tab-Import Custom Field Values')).toBeTruthy();
    expect(queryByTestId('edition-tab-Import')).toBeNull();
    expect(queryByTestId('edition-tab-Imports')).toBeNull();
    expect(queryByTestId('players-chrome-back')).toBeNull();
    expect(getByTestId('players-chrome-refresh')).toBeTruthy();
  });

  it('shows Save on import-players draft route only', () => {
    pathnameState.value = '/players/import-players';
    const { getByTestId, rerender, queryByTestId } = render(
      <PageChromeProvider>
        <DirtySeed />
        <PlayersChrome />
      </PageChromeProvider>
    );
    expect(getByTestId('players-chrome-save')).toBeTruthy();

    pathnameState.value = '/players/import-players/imports';
    rerender(
      <PageChromeProvider>
        <DirtySeed />
        <PlayersChrome />
      </PageChromeProvider>
    );
    expect(queryByTestId('players-chrome-save')).toBeNull();

    pathnameState.value = '/players/import-profile-images';
    rerender(
      <PageChromeProvider>
        <DirtySeed />
        <PlayersChrome />
      </PageChromeProvider>
    );
    expect(getByTestId('players-chrome-save')).toBeTruthy();

    pathnameState.value = '/players/import-custom-field-values';
    rerender(
      <PageChromeProvider>
        <DirtySeed />
        <PlayersChrome />
      </PageChromeProvider>
    );
    expect(getByTestId('players-chrome-save')).toBeTruthy();

    pathnameState.value = '/players/import-custom-field-values/imports';
    rerender(
      <PageChromeProvider>
        <DirtySeed />
        <PlayersChrome />
      </PageChromeProvider>
    );
    expect(queryByTestId('players-chrome-save')).toBeNull();
  });

  it('registers no breadcrumbs on List tab', () => {
    const { useBreadcrumbSegments } = require('@/components/layout/BreadcrumbProvider');
    pathnameState.value = '/players/list';
    render(
      <PageChromeProvider>
        <PlayersChrome />
      </PageChromeProvider>
    );
    expect(useBreadcrumbSegments).toHaveBeenCalledWith('players-chrome', []);
  });

  it('confirms dirty before switching tabs', async () => {
    mockConfirm.mockResolvedValue(false);
    const { getByTestId } = render(
      <PageChromeProvider>
        <DirtySeed />
        <PlayersChrome />
      </PageChromeProvider>
    );
    fireEvent.press(getByTestId('edition-tab-Import Players'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});

function DirtySeed() {
  useRegisterPageActions({
    save: jest.fn(),
    refresh: jest.fn(),
    isDirty: true,
    canSave: true,
  });
  return <Text>seed</Text>;
}
