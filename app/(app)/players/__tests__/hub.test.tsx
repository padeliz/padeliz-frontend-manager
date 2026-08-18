import PlayersHubIndex from '@/app/(app)/players/(hub)/index';
import { PageChromeProvider, useRegisterPageActions } from '@/components/chrome/PageChromeProvider';
import { PlayersChrome } from '@/components/players/PlayersChrome';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

const mockPush = jest.fn();
const pathnameState = { value: '/players/list' };

jest.mock('expo-router', () => ({
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
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="app-layout">{children}</View>,
  };
});

const mockConfirm = jest.fn(async () => true);
jest.mock('@/utils/softDirtyNav', () => ({
  confirmDiscardDirty: () => mockConfirm(),
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

  it('renders List, Import, and Imports tabs', () => {
    const { getByTestId, queryByTestId } = render(
      <PageChromeProvider>
        <PlayersChrome />
      </PageChromeProvider>
    );
    expect(getByTestId('edition-tab-List')).toBeTruthy();
    expect(getByTestId('edition-tab-Import')).toBeTruthy();
    expect(getByTestId('edition-tab-Imports')).toBeTruthy();
    expect(queryByTestId('edition-tab-Add')).toBeNull();
  });

  it('confirms dirty before switching tabs', async () => {
    mockConfirm.mockResolvedValue(false);
    const { getByTestId } = render(
      <PageChromeProvider>
        <DirtySeed />
        <PlayersChrome />
      </PageChromeProvider>
    );
    fireEvent.press(getByTestId('edition-tab-Import'));
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
