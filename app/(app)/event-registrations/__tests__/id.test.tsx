/**
 * @jest-environment jsdom
 */
import ViewEventRegistrationPage from '@/app/(app)/event-registrations/[id]';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetRegistration = jest.fn();
let lastConfig: any;

jest.mock('@/services/api/eventRegistrationsApi', () => ({
  EventRegistrationsApiService: jest.fn().mockImplementation(() => ({
    getRegistration: (...args: unknown[]) => mockGetRegistration(...args),
    updateRegistration: jest.fn(),
  })),
}));

jest.mock('@/components/registrations/RegistrationPaymentPanel', () => {
  const React = require('react');
  const { View } = require('react-native');
  const actual = jest.requireActual(
    '@/components/registrations/RegistrationPaymentPanel'
  );
  return {
    __esModule: true,
    feesAreLocked: actual.feesAreLocked,
    default: ({ registrationId }: any) => (
      <View testID={`payment-panel-${registrationId}`} />
    ),
  };
});

jest.mock('@/components/pages/ResourceViewPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    lastConfig = config;
    const { View } = require('react-native');
    void config.fetchResource(4);
    return <View testID="resource-view-page">{config.footer}</View>;
  },
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useLocalSearchParams: () => ({ id: '4' }),
  })
);

function registration(paymentStatus: string) {
  return {
    data: {
      id_registration: 4,
      event_id: 1,
      player_user_id: 2,
      is_minor: false,
      is_student: false,
      payment: 50,
      payment_status: paymentStatus,
      lifecycle_status: 'active',
      inserted_at: 1,
    },
  };
}

describe('ViewEventRegistrationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastConfig = null;
  });

  it('renders the payment panel in the view footer', async () => {
    mockGetRegistration.mockResolvedValue(registration('unpaid'));
    const { getByTestId } = render(<ViewEventRegistrationPage />);
    await waitFor(() => expect(getByTestId('payment-panel-4')).toBeTruthy());
  });

  it('keeps fee fields editable while the registration is unpaid', async () => {
    mockGetRegistration.mockResolvedValue(registration('unpaid'));
    render(<ViewEventRegistrationPage />);
    await waitFor(() => expect(mockGetRegistration).toHaveBeenCalled());
    await waitFor(() => {
      expect(lastConfig.readOnlyFields).toBeUndefined();
    });
  });

  it.each(['paid', 'refund_pending', 'refunded'])(
    'locks payment when payment_status is %s',
    async status => {
      mockGetRegistration.mockResolvedValue(registration(status));
      render(<ViewEventRegistrationPage />);
      await waitFor(() => {
        expect(lastConfig.readOnlyFields).toEqual(['payment']);
      });
    }
  );

  it('excludes legacy discount from the metadata form', async () => {
    mockGetRegistration.mockResolvedValue(registration('unpaid'));
    render(<ViewEventRegistrationPage />);
    await waitFor(() => {
      expect(lastConfig.excludeFields).toEqual(
        expect.arrayContaining(['discount'])
      );
    });
  });
});
