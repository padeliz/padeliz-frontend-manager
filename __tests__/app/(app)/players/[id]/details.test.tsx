/**
 * @jest-environment jsdom
 */
import ViewPlayerDetailsPage from '@/app/(app)/players/[id]/details';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useLocalSearchParams: () => ({ id: '42' }),
})
);

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    getPlayer: jest.fn(),
    updatePlayer: jest.fn(),
  })),
}));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <Text testID="app-layout">{children}</Text>
    ),
  };
});

let capturedConfig: Record<string, unknown> | null = null;

jest.mock('@/components/pages/ResourceViewPage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ config }: { config: Record<string, unknown> }) => {
      capturedConfig = config;
      return <Text testID="resource-view-page">Player details</Text>;
    },
  };
});

describe('ViewPlayerDetailsPage', () => {
  beforeEach(() => {
    capturedConfig = null;
  });

  it('passes embedded, externalChrome, and showLinkedEntities to ResourceViewPage', () => {
    render(
      <PageChromeProvider>
        <ViewPlayerDetailsPage />
      </PageChromeProvider>
    );
    expect(screen.getByTestId('resource-view-page')).toBeTruthy();
    expect(capturedConfig?.embedded).toBe(true);
    expect(capturedConfig?.externalChrome).toBe(true);
    expect(capturedConfig?.showSave).toBe(false);
    expect(capturedConfig?.showLinkedEntities).toBe(true);
    expect(typeof capturedConfig?.onChromeStateChange).toBe('function');
  });

  it('does not render AppLayout on the route', () => {
    render(
      <PageChromeProvider>
        <ViewPlayerDetailsPage />
      </PageChromeProvider>
    );
    expect(screen.queryByTestId('app-layout')).toBeNull();
  });
});
