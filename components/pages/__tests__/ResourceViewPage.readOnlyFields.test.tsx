/**
 * @jest-environment jsdom
 */
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
    useLocalSearchParams: () => ({ id: '1' }),
  })
);

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => ({
      display_field: 'name',
      resource_path: 'event-registrations',
      swagger_schema: {
        properties: {
          id_registration: { type: 'integer', readOnly: true },
          payment: { type: 'integer', title: 'Payment' },
          discount: { type: 'integer', title: 'Discount' },
          is_student: { type: 'boolean', title: 'Student' },
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

jest.mock('@/utils/linkedEntityService', () => ({
  LinkedEntityService: {
    detectLinkedEntities: jest.fn(async () => []),
  },
}));

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, headerActions }: any) => (
      <View>
        {headerActions}
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/pages/ResourceFieldDisplay', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ fieldKey }: any) => <Text>{`display:${fieldKey}`}</Text>,
  };
});

jest.mock('@/components/pages/ResourceFieldEdit', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ fieldKey }: any) => <Text>{`edit:${fieldKey}`}</Text>,
  };
});

jest.mock('@/utils/uploadMetadata', () => ({
  getUploadConfig: () => null,
}));

const fetchResource = jest.fn(async () => ({
  data: { id_registration: 1, payment: 50, discount: 0, is_student: false },
}));
const updateResource = jest.fn(async () => ({
  data: { id_registration: 1, payment: 50, discount: 0, is_student: false },
}));

function renderView(readOnlyFields?: string[]) {
  return render(
    <ResourceViewPage
      config={{
        resourceName: 'EventRegistration',
        resourceDisplayName: 'Registration',
        fetchResource,
        updateResource,
        readOnlyFields,
      }}
    />
  );
}

describe('ResourceViewPage readOnlyFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('edits every field when no readOnlyFields are configured', async () => {
    const { getByText } = renderView();
    await waitFor(() => expect(getByText('display:payment')).toBeTruthy());

    fireEvent.press(getByText('Edit'));

    await waitFor(() => {
      expect(getByText('edit:payment')).toBeTruthy();
    });
    expect(getByText('edit:discount')).toBeTruthy();
  });

  it('keeps configured fields display-only in edit mode', async () => {
    const { getByText, queryByText } = renderView(['payment', 'discount']);
    await waitFor(() => expect(getByText('display:payment')).toBeTruthy());

    fireEvent.press(getByText('Edit'));

    await waitFor(() => {
      expect(getByText('edit:is_student')).toBeTruthy();
    });
    expect(queryByText('edit:payment')).toBeNull();
    expect(queryByText('edit:discount')).toBeNull();
    expect(getByText('display:payment')).toBeTruthy();
    expect(getByText('display:discount')).toBeTruthy();
  });

  it('renders footer content below the field card', async () => {
    const { Text } = require('react-native');
    const { getByTestId } = render(
      <ResourceViewPage
        config={{
          resourceName: 'EventRegistration',
          resourceDisplayName: 'Registration',
          fetchResource,
          footer: <Text testID="view-footer">footer</Text>,
        }}
      />
    );
    await waitFor(() => expect(getByTestId('view-footer')).toBeTruthy());
  });
});
