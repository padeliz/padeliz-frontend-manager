import AppContentScroll from '@/components/layout/AppContentScroll';
import AppLayout from '@/components/layout/AppLayout';
import {
  BreadcrumbProvider,
  useBreadcrumbSegments,
} from '@/components/layout/BreadcrumbProvider';
import { useSubTabBar } from '@/components/layout/SubTabBarProvider';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { renderWithAppShell } from './renderWithAppShell';

jest.mock('@/context/managerAuth', () => ({
  useAuth: () => ({
    user: {
      id_user: 1,
      name: 'Manager',
      first_name: 'M',
      last_name: 'G',
    },
  }),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  usePathname: () => '/events/1',
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

jest.mock('@/components/events/EventTabsBar', () => {
  const { Text, View } = require('react-native');
  return function EventTabsBar({ tabs }: { tabs: { label: string }[] }) {
    return (
      <View testID="event-tabs-bar">
        {tabs.map(t => (
          <Text key={t.label} testID={`event-tab-${t.label}`}>
            {t.label}
          </Text>
        ))}
      </View>
    );
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

  it('keeps trail hooks in leaf slots, not AppLayoutChrome', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'AppLayout.tsx'),
      'utf8'
    );
    expect(src).toMatch(/function BreadcrumbSlot\b/);
    expect(src).toMatch(/function SubTabBarSlot\b/);
    expect(src).toContain('<BreadcrumbSlot');
    expect(src).toContain('<SubTabBarSlot');
    const chromeStart = src.indexOf('function AppLayoutChrome');
    const exportStart = src.indexOf('export default function AppLayout');
    expect(chromeStart).toBeGreaterThan(-1);
    expect(exportStart).toBeGreaterThan(chromeStart);
    const chromeBody = src.slice(chromeStart, exportStart);
    expect(chromeBody).not.toMatch(/useBreadcrumbTrail\s*\(/);
    expect(chromeBody).not.toMatch(/useSubTabBarTrail\s*\(/);
    expect(src).toMatch(
      /function BreadcrumbSlot\(\) \{[\s\S]*?useBreadcrumbTrail\s*\(/
    );
    expect(src).toMatch(
      /function SubTabBarSlot\(\) \{[\s\S]*?useSubTabBarTrail\s*\(/
    );
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

  it('does not re-render content children when subtab entry flips', async () => {
    let contentRenders = 0;

    function ContentProbe() {
      contentRenders += 1;
      return <Text testID="content-renders">{String(contentRenders)}</Text>;
    }

    function FlipSubTab() {
      const [n, setN] = useState(0);
      useSubTabBar('flip', [
        { label: `Flip${n}`, href: `/flip-${n}`, match: '/flip' },
      ]);
      return (
        <Text testID="flip-subtab" onPress={() => setN(v => v + 1)}>
          flip
        </Text>
      );
    }

    const { getByTestId } = render(
      <AppLayout title="Clubs">
        <FlipSubTab />
        <ContentProbe />
      </AppLayout>
    );

    await waitFor(() => {
      expect(getByTestId('event-tab-Flip0')).toBeTruthy();
    });
    const afterMount = Number(getByTestId('content-renders').props.children);

    fireEvent.press(getByTestId('flip-subtab'));

    await waitFor(() => {
      expect(getByTestId('event-tab-Flip1')).toBeTruthy();
    });
    expect(Number(getByTestId('content-renders').props.children)).toBe(
      afterMount
    );
  });

  it('does not re-render content children when breadcrumb items flip', async () => {
    let contentRenders = 0;

    function ContentProbe() {
      contentRenders += 1;
      return <Text testID="content-renders">{String(contentRenders)}</Text>;
    }

    function FlipCrumb() {
      const [n, setN] = useState(0);
      useBreadcrumbSegments('flip', [{ label: `Crumb${n}` }]);
      return (
        <Text testID="flip-crumb" onPress={() => setN(v => v + 1)}>
          flip
        </Text>
      );
    }

    const { getByTestId, getByText } = render(
      <BreadcrumbProvider>
        <AppLayout title="Clubs">
          <FlipCrumb />
          <ContentProbe />
        </AppLayout>
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByText('Crumb0')).toBeTruthy();
    });
    const afterMount = Number(getByTestId('content-renders').props.children);

    fireEvent.press(getByTestId('flip-crumb'));

    await waitFor(() => {
      expect(getByText('Crumb1')).toBeTruthy();
    });
    expect(Number(getByTestId('content-renders').props.children)).toBe(
      afterMount
    );
  });

  it('omits breadcrumb UI when no segments are registered', () => {
    const { queryByTestId } = render(
      <BreadcrumbProvider>
        <AppLayout title="Clubs">
          <Text>Body</Text>
        </AppLayout>
      </BreadcrumbProvider>
    );
    expect(queryByTestId('breadcrumbs-scroll')).toBeNull();
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
