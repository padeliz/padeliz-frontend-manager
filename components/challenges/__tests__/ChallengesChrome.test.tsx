import { ChallengesChrome } from '@/components/challenges/ChallengesChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  Slot: () => {
    const { Text } = require('react-native');
    return <Text testID="slot">slot</Text>;
  },
  usePathname: () => '/challenges/all',
})
);

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('@/components/editions/EditionTabsBar', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ tabs }: { tabs: { label: string }[] }) => (
    <>
      {tabs.map(t => (
        <Text key={t.label} testID={`tab-${t.label}`}>
          {t.label}
        </Text>
      ))}
    </>
  );
});

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({
    children,
    tabBar,
    headerActions,
  }: {
    children: React.ReactNode;
    tabBar?: React.ReactNode;
    headerActions?: React.ReactNode;
  }) => (
    <View>
      {headerActions}
      {tabBar}
      {children}
    </View>
  );
});

describe('ChallengesChrome', () => {
  it('renders three hub tabs without History and keeps list Refresh', () => {
    const { getByTestId, queryByTestId } = render(
      <PageChromeProvider>
        <ChallengesChrome />
      </PageChromeProvider>
    );

    expect(getByTestId('tab-All')).toBeTruthy();
    expect(getByTestId('tab-King of the Court')).toBeTruthy();
    expect(getByTestId('tab-Smash Contest')).toBeTruthy();
    expect(queryByTestId('tab-History')).toBeNull();
    expect(getByTestId('challenges-chrome-refresh')).toBeTruthy();
  });
});
