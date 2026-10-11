/**
 * @jest-environment jsdom
 */
import ResourceCreatePage from '@/components/pages/ResourceCreatePage';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const mockReplace = jest.fn();
const mockValidate: jest.Mock = jest.fn(() => ({ isValid: true, errors: [] }));
let mockSearchParams: Record<string, string> = {};
jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({
    replace: mockReplace,
    back: jest.fn(),
    push: jest.fn(),
  }),
  useLocalSearchParams: () => mockSearchParams,
})
);

const prizeMetadata = {
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
};

let mockMetadata: any = prizeMetadata;

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => mockMetadata,
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
  validateFormWithSubmission: (...args: unknown[]) => mockValidate(...args),
}));

jest.mock('@/components/pages/ResourceFieldEdit', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ fieldKey, error }: any) => (
      <View>
        <Text>{`field:${fieldKey}`}</Text>
        {error ? <Text>{error}</Text> : null}
      </View>
    ),
  };
});

jest.mock('@/components/ui/ManagerFileUpload', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ label, error }: any) => (
      <View testID="create-upload">
        <Text>{label}</Text>
        {error ? <Text>{error}</Text> : null}
      </View>
    ),
    uploadPendingFiles: jest.fn(async () => undefined),
  };
});

describe('ResourceCreatePage', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockValidate.mockReturnValue({ isValid: true, errors: [] });
    mockSearchParams = {};
    mockMetadata = prizeMetadata;
  });

  it(
    'Save in Page Header, no New heading, navigates after create-then-attach',
    async () => {
      let resolveCreate!: (value: {
        data: { id_prize: number; name: string };
      }) => void;
      const createResource = jest.fn(
        () =>
          new Promise(resolve => {
            resolveCreate = resolve;
          })
      );

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

      expect(screen.getByTestId('app-header-actions')).toBeTruthy();
      expect(screen.getByTestId('resource-create-save')).toBeTruthy();
      expect(screen.queryByText('New Prize')).toBeNull();
      expect(screen.getByTestId('create-upload')).toBeTruthy();
      fireEvent.press(screen.getByTestId('resource-create-save'));

      await waitFor(() => {
        expect(createResource).toHaveBeenCalled();
        expect(screen.getByTestId('resource-create-save-pending')).toBeTruthy();
      });
      await act(async () => {
        resolveCreate({ data: { id_prize: 42, name: 'Racket' } });
      });
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/prizes/42');
        expect(screen.getByTestId('resource-create-save-success')).toBeTruthy();
      });
    },
    15000
  );

  it('rejects Save after publishing validation errors', async () => {
    mockValidate.mockReturnValue({
      isValid: false,
      errors: [{ field: 'name', message: 'Name is required' }],
    });
    const createResource = jest.fn();

    render(
      <ResourceCreatePage
        config={{
          resourceName: 'Prize',
          resourceDisplayName: 'Prize',
          createResource,
          title: 'Add Prize',
        }}
      />
    );

    expect(screen.getByTestId('resource-create-save')).toBeTruthy();
    fireEvent.press(screen.getByTestId('resource-create-save'));
    expect(createResource).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeTruthy();
      expect(screen.getByTestId('resource-create-save-error')).toBeTruthy();
    });
  });
});

describe('ResourceCreatePage required upload gate', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockValidate.mockReturnValue({ isValid: true, errors: [] });
    mockSearchParams = {};
    mockMetadata = {
      display_field: 'name',
      resource_path: 'events',
      swagger_schema: {
        properties: {
          id_event: { type: 'integer', readOnly: true },
          name: { type: 'string', title: 'Name' },
          cover_images: {
            type: 'array',
            readOnly: true,
            title: 'Cover Images',
            'x-padeliz-upload': {
              mode: 'multi',
              max_files: 2,
              form_field: 'file',
              required: true,
              accept: ['image/png'],
              upload: {
                method: 'POST',
                path: '/api/v1/manager/events/{id}/cover-images',
              },
              delete: {
                method: 'DELETE',
                path: '/api/v1/manager/events/{id}/cover-images/{childId}',
              },
            },
          },
        },
      },
      filterable_fields: {},
      searchable_fields: ['name'],
      sortable_fields: ['name'],
    };
  });

  it('blocks create when required upload has no pending file', async () => {
    const createResource = jest.fn();
    render(
      <ResourceCreatePage
        config={{
          resourceName: 'Event',
          resourceDisplayName: 'Event',
          createResource,
          title: 'Add Event',
          getViewPath: id => `/events/${id}`,
        }}
      />
    );

    fireEvent.press(screen.getByTestId('resource-create-save'));
    await waitFor(() => {
      expect(createResource).not.toHaveBeenCalled();
      expect(screen.getByText('cover_images is required')).toBeTruthy();
    });
  });
});
