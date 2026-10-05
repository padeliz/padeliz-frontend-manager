import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: jest.fn() }),
})
);

describe('Breadcrumbs', () => {
  it('renders a horizontal scroll container for long trails', () => {
    const { getByTestId, getByText } = render(
      <Breadcrumbs
        items={[
          { label: 'Organizers', href: '/organizers' },
          { label: 'Bucharest Padel Tour' },
          { label: 'Events', href: '/events' },
          { label: '#37' },
          { label: 'Registrations' },
          { label: 'Register Players' },
        ]}
      />
    );

    expect(getByTestId('breadcrumbs-scroll')).toBeTruthy();
    expect(getByText('Register Players')).toBeTruthy();
  });
});
