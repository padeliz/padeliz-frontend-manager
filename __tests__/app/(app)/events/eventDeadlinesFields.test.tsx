/**
 * @jest-environment jsdom
 */
import AddEventPage from '@/app/(app)/events/add';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/services/api/eventsApi', () => ({
  EventsApiService: jest.fn().mockImplementation(() => ({
    createEvent: jest.fn(),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({}),
  })
);

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => ({
      display_field: 'name',
      resource_path: 'events',
      swagger_schema: {
        required: [
          'name',
          'registration_allowed_until',
          'cancellation_allowed_until',
        ],
        properties: {
          id_event: { type: 'integer', readOnly: true },
          name: { type: 'string', title: 'Name' },
          finalized_at: {
            type: 'integer',
            format: 'timestamp',
            nullable: true,
            title: 'Finalized At',
          },
          registration_allowed_until: {
            type: 'integer',
            format: 'timestamp',
            title: 'Registration Allowed Until',
          },
          cancellation_allowed_until: {
            type: 'integer',
            format: 'timestamp',
            title: 'Cancellation Allowed Until',
          },
        },
      },
      filterable_fields: {},
      searchable_fields: [],
      sortable_fields: [],
    }),
    getError: () => null,
    isLoading: () => false,
    fetchMetadata: jest.fn(),
  }),
}));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('@/components/pages/ResourceFieldEdit', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ fieldKey }: any) => <Text>{`field:${fieldKey}`}</Text>,
  };
});

describe('Event deadline fields', () => {
  it('renders both required deadline fields from OA', () => {
    render(<AddEventPage />);
    expect(screen.getByText('field:registration_allowed_until')).toBeTruthy();
    expect(screen.getByText('field:cancellation_allowed_until')).toBeTruthy();
  });
});
