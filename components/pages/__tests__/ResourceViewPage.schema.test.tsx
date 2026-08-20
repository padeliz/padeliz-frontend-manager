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
      display_field: 'original_filename',
      resource_path: 'player-profile-image-imports',
      swagger_schema: null,
      filterable_fields: {},
      searchable_fields: [],
      sortable_fields: [],
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

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
  };
});

const fetchResource = jest.fn(async () => ({
  data: {
    id_player_profile_image_import: 1,
    original_filename: 'batch.zip',
  },
}));

describe('ResourceViewPage schema guard', () => {
  it('shows an inline error when metadata has no swagger_schema', async () => {
    const { getByTestId } = render(
      <ResourceViewPage
        config={{
          resourceName: 'PlayerProfileImageImport',
          resourceDisplayName: 'Profile Image Import',
          fetchResource,
          title: 'Import Details',
          embedded: true,
        }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('resource-view-schema-error')).toBeTruthy();
    });
  });
});
