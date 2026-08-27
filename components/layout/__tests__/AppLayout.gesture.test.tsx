import AppContentScroll from '@/components/layout/AppContentScroll';
import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import { useSubTabBar } from '@/components/layout/SubTabBarProvider';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Text, View } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { BreadcrumbProvider } from '@/components/layout/BreadcrumbProvider';
import { renderWithAppShell } from './renderWithAppShell';

jest.mock('@/context/managerAuth', () => ({
  useAuth: () => ({
    user: {
      id_player: 1,
      name: 'Manager',
      first_name: 'M',
      last_name: 'G',
    },
  }),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  usePathname: () => '/editions/1',
  Link: ({ children }: any) => children,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
})
);

jest.mock('@/components/layout/TopNavigation', () => {
  const { View } = require('react-native');
  return function TopNavigation() {
    return <View testID="top-nav" />;
  };
});

jest.mock('@/components/layout/Sidebar', () => {
  const { View } = require('react-native');
  return function Sidebar() {
    return <View testID="sidebar" />;
  };
});

jest.mock('@/components/editions/EditionTabsBar', () => {
  const { View } = require('react-native');
  return function EditionTabsBar() {
    return <View testID="edition-tabs-bar" />;
  };
});

function CrumbRegistrar() {
  useBreadcrumbSegments('test', [{ label: 'Sidebar Clubs' }]);
  return null;
}

function SubTabRegistrar() {
  useSubTabBar('sub', [{ label: 'Knobs', href: '/k', match: '/knobs' }]);
  return null;
}

function RegistrarAboveLayout() {
  useBreadcrumbSegments('above', [{ label: 'Trail Item' }]);
  return (
    <AppLayout title="Clubs">
      <Text>Body</Text>
    </AppLayout>
  );
}

describe('AppLayout', () => {
  it('does not wrap content in an outer ScrollView on AppLayout itself', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'AppLayout.tsx'),
      'utf8'
    );
    expect(src).not.toMatch(/from 'react-native'[\s\S]*ScrollView/);
    expect(src).not.toMatch(/<BreadcrumbProvider/);
    expect(src).toContain('app-content-column');
    expect(src).toContain('min-h-0');
    expect(src).toContain('min-h-screen');
    expect(src).toContain('AppContentScroll');
  });

  it('renders tabBar and subTabBar before app-content-scroll', () => {
    const { getByTestId, getByText } = render(
      <AppLayout
        title="Clubs"
        description="Manage clubs"
        headerActions={<Text>Add</Text>}
        tabBar={<View testID="zone-tabs" />}
      >
        <SubTabRegistrar />
        <Text>Body</Text>
      </AppLayout>
    );

    expect(getByTestId('app-page-header')).toBeTruthy();
    expect(getByTestId('app-header-actions')).toBeTruthy();
    expect(getByTestId('app-tab-bar')).toBeTruthy();
    expect(getByTestId('zone-tabs')).toBeTruthy();
    expect(getByTestId('app-sub-tab-bar')).toBeTruthy();
    expect(getByTestId('app-content-column')).toBeTruthy();
    expect(getByTestId('app-content-scroll')).toBeTruthy();
    expect(getByText('Body')).toBeTruthy();
  });

  it('renders breadcrumbs from app-shell provider when registrar is above AppLayout', async () => {
    const { getByText } = renderWithAppShell(<RegistrarAboveLayout />);

    await waitFor(() => {
      expect(getByText('Trail Item')).toBeTruthy();
    });
  });

  it('renders breadcrumbs from child registrars inside content scroll', async () => {
    const { getByText } = render(
      <BreadcrumbProvider>
        <AppLayout title="Clubs">
          <CrumbRegistrar />
          <Text>Body</Text>
        </AppLayout>
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByText('Sidebar Clubs')).toBeTruthy();
    });
  });
});

describe('AppContentScroll', () => {
  it('imports ScrollView from react-native-gesture-handler', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'AppContentScroll.tsx'),
      'utf8'
    );
    expect(src).toMatch(
      /import\s*\{\s*ScrollView\s*\}\s*from\s*['"]react-native-gesture-handler['"]/
    );
    expect(src).not.toMatch(
      /import\s*\{[^}]*ScrollView[^}]*\}\s*from\s*['"]react-native['"]/
    );
    expect(src).toMatch(/contentClassName = 'px-6 pt-6 pb-5'/);
    const { getByTestId, getByText } = render(
      <AppContentScroll>
        <Text>Scroll body</Text>
      </AppContentScroll>
    );
    expect(getByTestId('app-content-scroll')).toBeTruthy();
    expect(getByText('Scroll body')).toBeTruthy();
  });
});

describe('Root layout gesture root', () => {
  it('wraps the app with GestureHandlerRootView', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'app', '_layout.tsx'),
      'utf8'
    );
    expect(src).toContain('GestureHandlerRootView');
    expect(src).toContain('app-gesture-root');
  });
});
