import {
  SubTabBarProvider,
  useSubTabBar,
  useSubTabBarTrail,
} from '@/components/layout/SubTabBarProvider';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

jest.mock('@/components/editions/EditionTabsBar', () => {
  const { View, Text, Pressable } = require('react-native');
  return function EditionTabsBar({ tabs }: any) {
    return (
      <View testID="edition-tabs-bar">
        {tabs.map((t: any) => (
          <Pressable
            key={t.href}
            testID={
              t.variant === 'live'
                ? 'open-live-lottery'
                : `edition-tab-${t.label}`
            }
            onPress={() => t.onPress?.()}
          >
            <Text>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  };
});

function TrailProbe() {
  const trail = useSubTabBarTrail();
  return <View testID="subtab-trail">{trail}</View>;
}

function Registrar({
  id,
  tabs,
}: {
  id: string;
  tabs: { label: string; href: string; match: string }[];
}) {
  useSubTabBar(id, tabs);
  return null;
}

describe('SubTabBarProvider', () => {
  it('registers sub-tabs while mounted', async () => {
    const { getByTestId } = render(
      <SubTabBarProvider>
        <Registrar
          id="reg"
          tabs={[
            { label: 'List', href: '/a', match: '/list' },
            { label: 'Register', href: '/b', match: '/register' },
          ]}
        />
        <TrailProbe />
      </SubTabBarProvider>
    );

    await waitFor(() => {
      expect(getByTestId('edition-tabs-bar')).toBeTruthy();
      expect(getByTestId('edition-tabs-bar').props.children).toBeTruthy();
    });
  });

  it('unregisters on unmount', async () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <SubTabBarProvider>
        <Registrar id="reg" tabs={[{ label: 'List', href: '/a', match: '/list' }]} />
        <TrailProbe />
      </SubTabBarProvider>
    );

    await waitFor(() => {
      expect(getByTestId('app-sub-tab-bar')).toBeTruthy();
    });

    rerender(
      <SubTabBarProvider>
        <TrailProbe />
      </SubTabBarProvider>
    );

    await waitFor(() => {
      expect(queryByTestId('app-sub-tab-bar')).toBeNull();
    });
  });

  it('preserves tab onPress handlers (e.g. LIVE lottery action)', async () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <SubTabBarProvider>
        <Registrar
          id="lottery"
          tabs={[
            {
              label: 'Open LIVE lottery',
              href: '/lottery-live/1',
              match: '/lottery-live',
              variant: 'live',
              onPress,
            },
          ]}
        />
        <TrailProbe />
      </SubTabBarProvider>
    );

    fireEvent.press(getByTestId('open-live-lottery'));
    await waitFor(() => expect(onPress).toHaveBeenCalled());
  });
});
