import PlayerImportSectionLayout from '@/components/players/PlayerImportSectionLayout';
import {
  SubTabBarProvider,
  useSubTabBarTrail,
} from '@/components/layout/SubTabBarProvider';
import fs from 'fs';
import path from 'path';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

jest.mock('@/components/chrome/PageChromeProvider', () => ({
  usePageChrome: () => ({ actions: null }),
}));

jest.mock('@/components/layout/BreadcrumbProvider', () => ({
  useBreadcrumbSegments: jest.fn(),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  usePathname: () => '/players/import-players',
  Slot: () => {
    const { View, Text } = require('react-native');
    return (
      <View testID="slot">
        <Text>slot</Text>
      </View>
    );
  },
  useRouter: () => ({ push: jest.fn() }),
})
);

jest.mock('@/components/events/EventTabsBar', () => {
  const { View, Text } = require('react-native');
  return function EventTabsBar({ tabs }: any) {
    return (
      <View testID="event-tabs-bar">
        {tabs.map((t: any) => (
          <Text key={t.href}>{t.label}</Text>
        ))}
      </View>
    );
  };
});

function SubTabChrome() {
  return <View testID="subtab-chrome">{useSubTabBarTrail()}</View>;
}

describe('PlayerImportSectionLayout', () => {
  it('uses useSubTabBar hook only, not a local EventTabsBar', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'PlayerImportSectionLayout.tsx'),
      'utf8'
    );
    expect(src).toContain('useSubTabBar');
    expect(src).not.toContain('<EventTabsBar');
    expect(src).not.toMatch(/ScrollView/);
  });

  it('registers sub-tabs and renders slot', async () => {
    const { useBreadcrumbSegments } = require('@/components/layout/BreadcrumbProvider');
    const { getByTestId, getByText } = render(
      <SubTabBarProvider>
        <SubTabChrome />
        <PlayerImportSectionLayout
          sectionSegment="import-players"
          importHref="/players/import-players"
          importsHref="/players/import-players/imports"
        />
      </SubTabBarProvider>
    );
    expect(getByTestId('event-tabs-bar')).toBeTruthy();
    expect(getByText('Import')).toBeTruthy();
    expect(getByText('Imports History')).toBeTruthy();
    expect(getByTestId('slot')).toBeTruthy();
    await waitFor(() => {
      expect(useBreadcrumbSegments).toHaveBeenCalledWith(
        'player-import-import-players',
        [{ label: 'Import' }],
        1
      );
    });
  });
});
