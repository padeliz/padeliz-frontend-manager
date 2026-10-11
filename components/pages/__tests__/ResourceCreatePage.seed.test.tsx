/**
 * @jest-environment jsdom
 */
import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

let mockSearchParams: Record<string, string> = {};

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({
    replace: jest.fn(),
    back: jest.fn(),
    push: jest.fn(),
  }),
  useLocalSearchParams: () => mockSearchParams,
})
);

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => ({
      display_field: 'id_registration',
      resource_path: 'event-registrations',
      swagger_schema: {
        properties: {
          id_registration: { type: 'integer', format: 'int64', readOnly: true },
          event_id: { type: 'integer', format: 'int64', title: 'Event' },
          player_user_id: { type: 'integer', format: 'int64', title: 'Player' },
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

jest.mock('@/utils/validationRules', () => ({
  validateFormWithSubmission: () => ({ isValid: true, errors: [] }),
}));

jest.mock('@/components/pages/ResourceFieldEdit', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ fieldKey, fieldValue }: any) => (
      <Text testID={`field-${fieldKey}`}>
        {`field:${fieldKey}:${fieldValue ?? ''}`}
      </Text>
    ),
  };
});

describe('ResourceCreatePage seedFromQuery', () => {
  beforeEach(() => {
    mockSearchParams = {};
  });

  it('leaves the form empty when seedFromQuery is off even with query params', async () => {
    mockSearchParams = { event_id: '4' };
    render(
      <ResourceCreatePage
        config={{
          resourceName: 'EventRegistration',
          resourceDisplayName: 'Registration',
          createResource: jest.fn(),
          title: 'Add Registration',
        }}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('field-event_id')).toHaveTextContent(
        'field:event_id:'
      );
    });
  });

  it('seeds writable fields from the query when seedFromQuery is true', async () => {
    mockSearchParams = { event_id: '4' };
    render(
      <ResourceCreatePage
        config={{
          resourceName: 'EventRegistration',
          resourceDisplayName: 'Registration',
          createResource: jest.fn(),
          title: 'Add Registration',
          seedFromQuery: true,
        }}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('field-event_id')).toHaveTextContent(
        'field:event_id:4'
      );
    });
  });

  it('stays empty when seedFromQuery is true but the query has no writable fields', async () => {
    mockSearchParams = {};
    render(
      <ResourceCreatePage
        config={{
          resourceName: 'EventRegistration',
          resourceDisplayName: 'Registration',
          createResource: jest.fn(),
          title: 'Add Registration',
          seedFromQuery: true,
        }}
      />
    );
    await waitFor(() => {
      expect(screen.getByTestId('field-event_id')).toHaveTextContent(
        'field:event_id:'
      );
    });
  });
});
