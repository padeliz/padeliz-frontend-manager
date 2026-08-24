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
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: jest.fn(),
    push: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

const divisionMetadata = {
  version: 'v1',
  schema_name: 'Division',
  resource_path: 'divisions',
  display_field: 'name',
  swagger_schema: {
    required: ['name', 'color', 'its_first_edition_id'],
    properties: {
      id_division: { type: 'integer', format: 'int64', readOnly: true },
      name: { type: 'string', title: 'Name' },
      color: {
        type: 'string',
        format: 'color',
        pattern: '^#[0-9A-Fa-f]{6}$',
        title: 'Color',
      },
      its_first_edition_id: {
        type: 'integer',
        format: 'int64',
        title: 'First Edition',
      },
      its_first_edition: {
        oneOf: [{ $ref: '#/components/schemas/Edition' }],
        title: 'First Edition',
      },
      location: {
        oneOf: [{ $ref: '#/components/schemas/Location' }],
      },
    },
  },
  filterable_fields: {
    its_first_edition_id: {
      type: 'foreign_key',
      related_schema_name: 'Edition',
      related_schema_field: 'name',
    },
  },
  searchable_fields: ['name'],
  sortable_fields: ['name'],
  request_body: {},
};

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => divisionMetadata,
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
    default: ({ children, headerActions }: any) => (
      <View>
        {headerActions ? <View testID="app-header-actions">{headerActions}</View> : null}
        {children}
      </View>
    ),
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

describe('ResourceCreatePage nested relations + resource_path', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('skips typeless nested relation fields and does not crash', () => {
    render(
      <ResourceCreatePage
        config={{
          resourceName: 'Division',
          resourceDisplayName: 'Division',
          createResource: jest.fn(),
          title: 'Add Division',
        }}
      />
    );

    expect(screen.getByText('field:name')).toBeTruthy();
    expect(screen.getByText('field:color')).toBeTruthy();
    expect(screen.getByText('field:its_first_edition_id')).toBeTruthy();
    expect(screen.queryByText('field:its_first_edition')).toBeNull();
    expect(screen.queryByText('field:location')).toBeNull();
  });

  it(
    'navigates with metadata.resource_path when getViewPath is omitted',
    async () => {
      const createResource = jest.fn(async () => ({
        data: { id_division: 7, name: 'Advanced' },
      }));

      render(
        <ResourceCreatePage
          config={{
            resourceName: 'Division',
            resourceDisplayName: 'Division',
            createResource,
            title: 'Add Division',
          }}
        />
      );

      fireEvent.press(screen.getByTestId('resource-create-save'));

      await waitFor(() => {
        expect(createResource).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith('/divisions/7');
      });
    },
    15000
  );
});
