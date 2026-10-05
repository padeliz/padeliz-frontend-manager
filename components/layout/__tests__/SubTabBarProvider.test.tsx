import {
  SubTabBarProvider,
  useSubTabBar,
  useSubTabBarTrail,
} from '@/components/layout/SubTabBarProvider';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

const mockNavigated = jest.fn();

jest.mock('@/components/events/EventTabsBar', () => {
  const { View, Text, Pressable } = require('react-native');
  return function EventTabsBar({ tabs, onBeforeNavigate }: any) {
    return (
      <View testID="event-tabs-bar">
        {tabs.map((t: any) => (
          <Pressable
            key={t.href}
            testID={
              t.variant === 'live'
                ? 'open-live-lottery'
                : `event-tab-${t.label}`
            }
            disabled={!!t.disabled}
            accessibilityState={{ disabled: !!t.disabled }}
            onPress={() => {
              void (async () => {
                if (typeof t.onPress === 'function') {
                  t.onPress();
                  return;
                }
                if (onBeforeNavigate) {
                  const ok = await onBeforeNavigate();
                  mockNavigated(ok);
                  if (!ok) return;
                } else {
                  mockNavigated(true);
                }
              })();
            }}
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
  onBeforeNavigate,
}: {
  id: string;
  tabs: {
    label: string;
    href: string;
    match: string;
    variant?: 'default' | 'live';
    disabled?: boolean;
    onPress?: () => void;
  }[];
  onBeforeNavigate?: () => Promise<boolean>;
}) {
  useSubTabBar(id, tabs, onBeforeNavigate);
  return null;
}

describe('SubTabBarProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      expect(getByTestId('event-tabs-bar')).toBeTruthy();
      expect(getByTestId('event-tabs-bar').props.children).toBeTruthy();
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

  it('updates disabled when only disabled flips', async () => {
    const onPress = jest.fn();
    function Harness() {
      const [disabled, setDisabled] = useState(true);
      return (
        <>
          <Registrar
            id="lottery"
            tabs={[
              {
                label: 'Open LIVE lottery',
                href: '/lottery-live/1',
                match: '/lottery-live',
                variant: 'live',
                disabled,
                onPress,
              },
            ]}
          />
          <Text
            testID="flip-disabled"
            onPress={() => setDisabled(d => !d)}
          >
            flip
          </Text>
        </>
      );
    }

    const { getByTestId } = render(
      <SubTabBarProvider>
        <Harness />
        <TrailProbe />
      </SubTabBarProvider>
    );

    await waitFor(() => {
      expect(getByTestId('open-live-lottery').props.accessibilityState).toEqual(
        { disabled: true }
      );
    });

    fireEvent.press(getByTestId('flip-disabled'));

    await waitFor(() => {
      expect(getByTestId('open-live-lottery').props.accessibilityState).toEqual(
        { disabled: false }
      );
    });
  });

  it('does not re-render a stable registrar when a sibling updates entry', async () => {
    let stableRenders = 0;
    const stableTabs = [
      { label: 'Stable', href: '/stable', match: '/stable' },
    ];

    function StableRegistrar() {
      stableRenders += 1;
      useSubTabBar('stable', stableTabs);
      return <Text testID="stable-renders">{String(stableRenders)}</Text>;
    }

    function FlipRegistrar() {
      const [n, setN] = useState(0);
      useSubTabBar('flip', [
        { label: `Flip${n}`, href: `/flip-${n}`, match: '/flip' },
      ]);
      return (
        <Text testID="flip-tabs" onPress={() => setN(v => v + 1)}>
          flip
        </Text>
      );
    }

    const { getByTestId } = render(
      <SubTabBarProvider>
        <StableRegistrar />
        <FlipRegistrar />
        <TrailProbe />
      </SubTabBarProvider>
    );

    await waitFor(() => {
      expect(getByTestId('event-tab-Flip0')).toBeTruthy();
    });
    const afterMount = Number(getByTestId('stable-renders').props.children);

    fireEvent.press(getByTestId('flip-tabs'));

    await waitFor(() => {
      expect(getByTestId('event-tab-Flip1')).toBeTruthy();
    });
    expect(Number(getByTestId('stable-renders').props.children)).toBe(
      afterMount
    );
  });

  it('invokes the latest onPress when only handler identity changes', async () => {
    const first = jest.fn();
    const second = jest.fn();

    function Harness() {
      const [handler, setHandler] = useState(() => first);
      const tabs = [
        {
          label: 'Open LIVE lottery',
          href: '/lottery-live/1',
          match: '/lottery-live',
          variant: 'live' as const,
          onPress: handler,
        },
      ];
      return (
        <>
          <Registrar id="lottery" tabs={tabs} />
          <Text
            testID="flip-press"
            onPress={() => setHandler(() => second)}
          >
            flip
          </Text>
        </>
      );
    }

    const { getByTestId, queryByTestId } = render(
      <SubTabBarProvider>
        <Harness />
        <TrailProbe />
      </SubTabBarProvider>
    );

    await waitFor(() => {
      expect(getByTestId('open-live-lottery')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('flip-press'));
    });

    expect(queryByTestId('app-sub-tab-bar')).toBeTruthy();
    fireEvent.press(getByTestId('open-live-lottery'));
    await waitFor(() => expect(second).toHaveBeenCalled());
    expect(first).not.toHaveBeenCalled();
  });

  it('treats omitted disabled and disabled:false as equal (no entry churn)', async () => {
    function Harness() {
      const [tick, setTick] = useState(0);
      const tabs =
        tick === 0
          ? [
              {
                label: 'Open LIVE lottery',
                href: '/lottery-live/1',
                match: '/lottery-live',
                variant: 'live' as const,
                onPress: () => {},
              },
            ]
          : [
              {
                label: 'Open LIVE lottery',
                href: '/lottery-live/1',
                match: '/lottery-live',
                variant: 'live' as const,
                disabled: false,
                onPress: () => {},
              },
            ];
      useSubTabBar('lottery', tabs);
      return (
        <Text testID="flip-equiv" onPress={() => setTick(1)}>
          flip
        </Text>
      );
    }

    const { getByTestId, queryByTestId } = render(
      <SubTabBarProvider>
        <Harness />
        <TrailProbe />
      </SubTabBarProvider>
    );

    await waitFor(() => {
      expect(getByTestId('open-live-lottery')).toBeTruthy();
    });

    fireEvent.press(getByTestId('flip-equiv'));

    await waitFor(() => {
      expect(queryByTestId('app-sub-tab-bar')).toBeTruthy();
      expect(getByTestId('open-live-lottery').props.accessibilityState).toEqual(
        { disabled: false }
      );
    });
  });

  it('does not clear the bar when tabs array identity changes but descriptors match', async () => {
    function Harness() {
      const [n, setN] = useState(0);
      const tabs = [
        { label: 'Prizes', href: '/p', match: 'prizes' },
        {
          label: 'Open LIVE lottery',
          href: '/lottery-live/1',
          match: '/lottery-live',
          variant: 'live' as const,
          disabled: false,
          onPress: () => {},
        },
      ];
      useSubTabBar('stable-desc', tabs);
      return (
        <Text testID="bump-identity" onPress={() => setN(v => v + 1)}>
          {String(n)}
        </Text>
      );
    }

    const { getByTestId } = render(
      <SubTabBarProvider>
        <Harness />
        <TrailProbe />
      </SubTabBarProvider>
    );

    await waitFor(() => {
      expect(getByTestId('event-tab-Prizes')).toBeTruthy();
    });

    fireEvent.press(getByTestId('bump-identity'));
    fireEvent.press(getByTestId('bump-identity'));

    await waitFor(() => {
      expect(getByTestId('event-tab-Prizes')).toBeTruthy();
      expect(getByTestId('bump-identity').props.children).toBe('2');
    });
  });

  it('uses the latest onBeforeNavigate without clearing the bar', async () => {
    const tab = { label: 'List', href: '/a', match: '/list' };

    function Harness() {
      const [gate, setGate] = useState(() => async () => true);
      return (
        <>
          <Registrar id="reg" tabs={[tab]} onBeforeNavigate={gate} />
          <Text
            testID="flip-gate"
            onPress={() => setGate(() => async () => false)}
          >
            flip
          </Text>
        </>
      );
    }

    const { getByTestId, queryByTestId } = render(
      <SubTabBarProvider>
        <Harness />
        <TrailProbe />
      </SubTabBarProvider>
    );

    await waitFor(() => {
      expect(getByTestId('app-sub-tab-bar')).toBeTruthy();
    });

    fireEvent.press(getByTestId('event-tab-List'));
    await waitFor(() => expect(mockNavigated).toHaveBeenCalledWith(true));

    mockNavigated.mockClear();
    await act(async () => {
      fireEvent.press(getByTestId('flip-gate'));
    });

    expect(queryByTestId('app-sub-tab-bar')).toBeTruthy();
    fireEvent.press(getByTestId('event-tab-List'));
    await waitFor(() => expect(mockNavigated).toHaveBeenCalledWith(false));
  });
});
