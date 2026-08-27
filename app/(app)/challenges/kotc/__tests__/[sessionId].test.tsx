import KotcLivePage from '@/app/(app)/challenges/kotc/[sessionId]';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

let mockGlobalParams: Record<string, string | string[] | undefined> = {};

jest.mock('@/context/managerAuth', () => ({
  useAuth: () => ({ user: { name: 'Test User' } }),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useLocalSearchParams: () => ({ sessionId: '42' }),
    useGlobalSearchParams: () => mockGlobalParams,
    usePathname: () => '/challenges/kotc/42',
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  })
);

jest.mock('@/components/layout/BreadcrumbProvider', () => ({
  useBreadcrumbTrail: () => [],
  BreadcrumbProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/layout/TopNavigation', () => () => null);
jest.mock('@/components/layout/Sidebar', () => () => null);
jest.mock('@/components/layout/AppContentScroll', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View testID="app-content-scroll">{children}</View>
    ),
  };
});

jest.mock('@/components/challenges/KotcLivePanel', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({
    onFooterReady,
  }: {
    onFooterReady?: (node: React.ReactNode | null) => void;
  }) => {
    React.useEffect(() => {
      onFooterReady?.(
        <Text testID="footer-probe">Bottom footer</Text>
      );
      return () => onFooterReady?.(null);
    }, [onFooterReady]);
    return (
      <View testID="kotc-live-panel">
        <Text testID="kotc-undo" accessibilityLabel="Undo">
          Undo
        </Text>
        <Text testID="kotc-complete" accessibilityLabel="Complete">
          Complete
        </Text>
      </View>
    );
  };
});

describe('KotcLivePage', () => {
  beforeEach(() => {
    mockGlobalParams = {};
  });

  it('renders fullscreen toggle in AppLayout header actions', () => {
    const { getByTestId } = render(<KotcLivePage />);
    expect(getByTestId('app-header-actions')).toBeTruthy();
    expect(getByTestId('fullscreen-toggle')).toBeTruthy();
    expect(getByTestId('kotc-undo')).toBeTruthy();
    expect(getByTestId('kotc-complete')).toBeTruthy();
  });

  it('hides page header when fs=1', () => {
    mockGlobalParams = { fs: '1' };
    const { queryByTestId, getByTestId } = render(<KotcLivePage />);
    expect(queryByTestId('app-page-header')).toBeNull();
    expect(queryByTestId('fullscreen-toggle')).toBeNull();
    expect(getByTestId('kotc-live-panel')).toBeTruthy();
  });

  it('docks panel footer into AppLayout footer', async () => {
    const { getByTestId } = render(<KotcLivePage />);
    await waitFor(() => expect(getByTestId('app-footer')).toBeTruthy());
    expect(getByTestId('footer-probe')).toBeTruthy();
  });

  it('keeps footer visible when fs=1', async () => {
    mockGlobalParams = { fs: '1' };
    const { getByTestId, queryByTestId } = render(<KotcLivePage />);
    expect(queryByTestId('app-page-header')).toBeNull();
    await waitFor(() => expect(getByTestId('app-footer')).toBeTruthy());
    expect(getByTestId('footer-probe')).toBeTruthy();
  });
});
