import AppLayout from '@/components/layout/AppLayout';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

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

jest.mock('expo-router', () => ({
  usePathname: () => '/editions/1',
  Link: ({ children }: any) => children,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

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

jest.mock('@/components/layout/Breadcrumbs', () => {
  const { View } = require('react-native');
  return function Breadcrumbs() {
    return <View testID="breadcrumbs" />;
  };
});

describe('AppLayout gesture scroll', () => {
  it('imports ScrollView from react-native-gesture-handler', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'AppLayout.tsx'),
      'utf8'
    );
    expect(src).toMatch(
      /import\s*\{\s*ScrollView\s*\}\s*from\s*['"]react-native-gesture-handler['"]/
    );
    expect(src).not.toMatch(
      /import\s*\{[^}]*ScrollView[^}]*\}\s*from\s*['"]react-native['"]/
    );
    const { getByText } = render(
      <AppLayout title="Test">
        <Text>Body</Text>
      </AppLayout>
    );
    expect(getByText('Body')).toBeTruthy();
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
