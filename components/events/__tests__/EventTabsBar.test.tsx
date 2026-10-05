import EventTabsBar from '@/components/events/EventTabsBar';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockPathname = { value: '/events/1/lottery/prizes' };

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  usePathname: () => mockPathname.value,
  useRouter: () => ({ push: jest.fn() }),
})
);

describe('EventTabsBar', () => {
  it('highlights nested lottery tab when match is a single segment', () => {
    mockPathname.value = '/events/1/lottery/prizes';
    const { getByTestId } = render(
      <EventTabsBar
        tabs={[
          {
            label: 'Prizes',
            href: '/events/1/lottery/prizes',
            match: 'prizes',
          },
          {
            label: 'Rules',
            href: '/events/1/lottery/rules',
            match: 'rules',
          },
        ]}
      />
    );

    expect(getByTestId('event-tab-Prizes').props.className).toContain(
      'bg-blue-600'
    );
    expect(getByTestId('event-tab-Rules').props.className).toContain(
      'bg-gray-100'
    );
  });

  it('disabled live chip prevents press and shows disabled styling', () => {
    const onPress = jest.fn();
    mockPathname.value = '/events/1/lottery/prizes';
    const { getByTestId } = render(
      <EventTabsBar
        tabs={[
          {
            label: 'Open LIVE lottery',
            href: '/lottery-live/1',
            match: '/lottery-live',
            variant: 'live',
            disabled: true,
            onPress,
          },
        ]}
      />
    );
    const chip = getByTestId('open-live-lottery');
    expect(chip.props.accessibilityState?.disabled).toBe(true);
    expect(String(chip.props.className)).toContain('opacity-60');
    fireEvent.press(chip);
    expect(onPress).not.toHaveBeenCalled();
  });
});
