/**
 * @jest-environment jsdom
 */
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: '1' }),
}));

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => ({
      display_field: 'name',
      resource_path: 'clubs',
      swagger_schema: {
        properties: {
          id_club: { type: 'integer', format: 'int64', readOnly: true },
          name: { type: 'string', title: 'Name' },
        },
      },
      filterable_fields: {},
      searchable_fields: ['name'],
      sortable_fields: ['name'],
    }),
    getError: () => null,
    isLoading: () => false,
    fetchMetadata: jest.fn(),
  }),
}));

jest.mock('@/components/ui/LoadingSpinner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text>loading</Text> };
});

jest.mock('@/components/ui/ManagerFileUpload', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View /> };
});

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="app-layout">{children}</View>,
  };
});

jest.mock('@/utils/linkedEntityService', () => ({
  LinkedEntityService: { detectLinkedEntities: async () => [] },
}));

jest.mock('@/components/pages/LinkedEntitySection', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="linked-entities" /> };
});

jest.mock('@/components/pages/ResourceFieldDisplay', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ fieldKey }: any) => <Text>{`field:${fieldKey}`}</Text>,
  };
});

jest.mock('@/utils/nestedRelationProperty', () => ({
  isNestedRelationProperty: () => false,
}));

jest.mock('@/utils/uploadMetadata', () => ({
  getUploadConfig: () => null,
}));

const fetchResource = jest.fn(async () => ({
  data: { id_club: 1, name: 'Club A' },
}));

const updateResource = jest.fn(async () => ({
  data: { id_club: 1, name: 'Club A' },
}));

describe('ResourceViewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides Edit toggle when updateResource is omitted', async () => {
    const { queryByText, getByText } = render(
      <ResourceViewPage
        config={{
          resourceName: 'Club',
          resourceDisplayName: 'Club',
          fetchResource,
          title: 'Club Details',
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('field:name')).toBeTruthy();
    });
    expect(queryByText('Edit')).toBeNull();
  });

  it('hides Edit toggle when embedded and updateResource is omitted', async () => {
    const { queryByText, getByText } = render(
      <ResourceViewPage
        config={{
          resourceName: 'Club',
          resourceDisplayName: 'Club',
          fetchResource,
          title: 'Club Details',
          embedded: true,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('field:name')).toBeTruthy();
    });
    expect(queryByText('Edit')).toBeNull();
  });

  it('shows Edit when updateResource is passed', async () => {
    const { getByText } = render(
      <ResourceViewPage
        config={{
          resourceName: 'Club',
          resourceDisplayName: 'Club',
          fetchResource,
          updateResource,
          title: 'Club Details',
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('Edit')).toBeTruthy();
    });
  });
});
