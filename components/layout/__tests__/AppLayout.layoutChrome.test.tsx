import AppLayout from '@/components/layout/AppLayout';
import { SubTabBarProvider } from '@/components/layout/SubTabBarProvider';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

let mockGlobalParams: Record<string, string | string[] | undefined> = {};
let mockLocalParams: Record<string, string | string[] | undefined> = {};

jest.mock('@/context/managerAuth', () => ({
  useAuth: () => ({ user: { name: 'Test User' } }),
}));

jest.mock('@/components/layout/BreadcrumbProvider', () => ({
  useBreadcrumbTrail: () => [
    { label: 'Home', href: '/' },
    { label: 'KOTC' },
  ],
  BreadcrumbProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  usePathname: () => '/challenges/kotc/1',
  useGlobalSearchParams: () => mockGlobalParams,
  useLocalSearchParams: () => mockLocalParams,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
})
);

jest.mock('@/components/layout/TopNavigation', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="top-navigation-inner" />;
});

jest.mock('@/components/layout/Sidebar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => <View testID="sidebar-inner" />;
});

jest.mock('@/components/layout/AppContentScroll', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <View testID="app-content-scroll">{children}</View>
  );
});

function renderLayout(
  params: Record<string, string | string[] | undefined> = {},
  footer?: React.ReactNode
) {
  mockGlobalParams = params;
  mockLocalParams = {};

  return render(
    <SubTabBarProvider>
      <AppLayout
        title="King of the Court"
        headerActions={<Text testID="fixture-header-action">Action</Text>}
        tabBar={<View testID="fixture-tab-bar-inner" />}
        footer={footer}
      >
        <Text testID="fixture-content">Content</Text>
      </AppLayout>
    </SubTabBarProvider>
  );
}

describe('AppLayout layout chrome', () => {
  beforeEach(() => {
    mockGlobalParams = {};
    mockLocalParams = {};
  });

  it('shows all chrome regions when no layout params', () => {
    const { getByTestId, queryByTestId } = renderLayout();
    expect(getByTestId('app-top-navigation')).toBeTruthy();
    expect(getByTestId('app-sidebar')).toBeTruthy();
    expect(getByTestId('breadcrumbs-scroll')).toBeTruthy();
    expect(getByTestId('app-page-header')).toBeTruthy();
    expect(getByTestId('app-tab-bar')).toBeTruthy();
    expect(getByTestId('app-content-column')).toBeTruthy();
    expect(queryByTestId('app-sub-tab-bar')).toBeNull();
    expect(queryByTestId('app-footer')).toBeNull();
  });

  it('hides all six chrome regions when fs=1', () => {
    const { getByTestId, queryByTestId } = renderLayout({ fs: '1' });
    expect(queryByTestId('app-top-navigation')).toBeNull();
    expect(queryByTestId('app-sidebar')).toBeNull();
    expect(queryByTestId('breadcrumbs-scroll')).toBeNull();
    expect(queryByTestId('app-page-header')).toBeNull();
    expect(queryByTestId('app-tab-bar')).toBeNull();
    expect(queryByTestId('app-sub-tab-bar')).toBeNull();
    expect(getByTestId('app-content-column')).toBeTruthy();
    expect(getByTestId('fixture-content')).toBeTruthy();
  });

  it('renders optional footer beside the content scroll', () => {
    const { getByTestId, queryByTestId } = renderLayout(
      {},
      <Text testID="footer-probe">Footer</Text>
    );
    expect(getByTestId('app-content-scroll')).toBeTruthy();
    expect(getByTestId('app-footer')).toBeTruthy();
    expect(getByTestId('footer-probe')).toBeTruthy();
    expect(queryByTestId('app-footer')).toBeTruthy();
  });

  it('keeps footer visible when fs=1', () => {
    const { getByTestId, queryByTestId } = renderLayout(
      { fs: '1' },
      <Text testID="footer-probe">Footer</Text>
    );
    expect(queryByTestId('app-page-header')).toBeNull();
    expect(getByTestId('app-footer')).toBeTruthy();
    expect(getByTestId('footer-probe')).toBeTruthy();
  });
});
