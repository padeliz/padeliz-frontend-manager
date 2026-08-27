import EditionTabsBar from '@/components/editions/EditionTabsBar';
import { render } from '@testing-library/react-native';
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
});
