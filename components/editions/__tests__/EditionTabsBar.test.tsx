import EditionTabsBar from '@/components/editions/EditionTabsBar';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockPathname = { value: '/editions/1/lottery/prizes' };

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  usePathname: () => mockPathname.value,
  useRouter: () => ({ push: jest.fn() }),
})
);

describe('EditionTabsBar', () => {
  it('highlights nested lottery tab when match is a single segment', () => {
    mockPathname.value = '/editions/1/lottery/prizes';
    const { getByTestId } = render(
      <EditionTabsBar
        tabs={[
          {
            label: 'Prizes',
            href: '/editions/1/lottery/prizes',
            match: 'prizes',
          },
          {
            label: 'Rules',
            href: '/editions/1/lottery/rules',
            match: 'rules',
          },
        ]}
      />
    );

    expect(getByTestId('edition-tab-Prizes').props.className).toContain(
      'bg-blue-600'
    );
    expect(getByTestId('edition-tab-Rules').props.className).toContain(
      'bg-gray-100'
    );
  });

  it('disabled live chip prevents press and shows disabled styling', () => {
    const onPress = jest.fn();
    mockPathname.value = '/editions/1/lottery/prizes';
    const { getByTestId } = render(
      <EditionTabsBar
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
