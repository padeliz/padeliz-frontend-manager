import AppLayout from '@/components/layout/AppLayout';
import { useBreadcrumbSegments } from '@/components/layout/BreadcrumbProvider';
import React from 'react';
import { Text } from 'react-native';
import { waitFor } from '@testing-library/react-native';
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
  usePathname: () => '/clubs/1',
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

function RegistrarAboveLayout() {
  useBreadcrumbSegments('integration', [{ label: 'Clubs', href: '/clubs' }, { label: 'Ace' }]);
  return (
    <AppLayout title="Club: Ace">
      <Text>Body</Text>
    </AppLayout>
  );
}

describe('renderWithAppShell', () => {
  it('exports a BreadcrumbProvider wrapper', () => {
    const { getByText } = renderWithAppShell(
      <RegistrarAboveLayout />
    );

    expect(getByText('Body')).toBeTruthy();
  });

  it('composes breadcrumbs when registrar is above AppLayout', async () => {
    const { getByText } = renderWithAppShell(<RegistrarAboveLayout />);

    await waitFor(() => {
      expect(getByText('Ace')).toBeTruthy();
    });
  });
});
