/**
 * @jest-environment jsdom
 */
import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const mockReplace = jest.fn();
let mockSearchParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: jest.fn(),
    push: jest.fn(),
  }),
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => ({
      display_field: 'name',
      resource_path: 'prizes',
      swagger_schema: {
        properties: {
          id_prize: { type: 'integer', format: 'int64', readOnly: true },
          name: { type: 'string', title: 'Name' },
          url: {
            type: 'string',
            readOnly: true,
            title: 'Media',
            'x-padeliz-upload': {
              mode: 'single',
              max_files: 1,
              max_size_kb: 30720,
              accept: ['image/png'],
              form_field: 'file',
              upload: {
                method: 'POST',
                path: '/api/v1/manager/prizes/{id}/media',
              },
            },
          },
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
    default: ({ fieldKey }: any) => <Text>{`field:${fieldKey}`}</Text>,
  };
});

jest.mock('@/components/ui/ManagerFileUpload', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ label }: any) => (
      <View testID="create-upload">
        <Text>{label}</Text>
      </View>
    ),
    uploadPendingFiles: jest.fn(async () => undefined),
  };
});

describe('ResourceCreatePage', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = {};
  });

  it(
    'shows upload UI and navigates after create-then-attach',
    async () => {
      const createResource = jest.fn(async () => ({
        data: { id_prize: 42, name: 'Racket' },
      }));

      render(
        <ResourceCreatePage
          config={{
            resourceName: 'Prize',
            resourceDisplayName: 'Prize',
            createResource,
            title: 'Add Prize',
            getViewPath: id => `/prizes/${id}`,
          }}
        />
      );

      expect(screen.getByTestId('create-upload')).toBeTruthy();
      fireEvent.press(screen.getByText('Save'));

      await waitFor(() => {
        expect(createResource).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith('/prizes/42');
      });
    },
    15000
  );
});
