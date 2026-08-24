/**
 * @jest-environment jsdom
 */
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: '1' }),
}));

const clubMetadata = {
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
};

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => clubMetadata,
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
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, title, headerActions }: any) => (
      <View testID="app-layout">
        <Text testID="app-layout-title">{title}</Text>
        {headerActions ? (
          <View testID="app-header-actions">{headerActions}</View>
        ) : null}
        {children}
      </View>
    ),
  };
});

jest.mock('@/utils/linkedEntityService', () => ({
  LinkedEntityService: {
    detectLinkedEntities: jest.fn(async () => []),
  },
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

async function waitForLinkedEntityDetection() {
  const { LinkedEntityService } = require('@/utils/linkedEntityService');
  await waitFor(() => {
    expect(LinkedEntityService.detectLinkedEntities).toHaveBeenCalled();
  });
  await act(async () => {
    await Promise.all(
      LinkedEntityService.detectLinkedEntities.mock.results.map((r: any) =>
        Promise.resolve(r.value)
      )
    );
    // Flush the effect continuation that calls setLinkedEntities
    await Promise.resolve();
  });
}

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
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('field:name')).toBeTruthy();
    });
    await waitForLinkedEntityDetection();
    expect(queryByText('Edit')).toBeNull();
    expect(queryByText('Club Information')).toBeNull();
  });

  it('hides Edit toggle when embedded and updateResource is omitted', async () => {
    const { queryByText, getByText } = render(
      <ResourceViewPage
        config={{
          resourceName: 'Club',
          resourceDisplayName: 'Club',
          fetchResource,
          embedded: true,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('field:name')).toBeTruthy();
    });
    expect(queryByText('Edit')).toBeNull();
  });

  it('standalone: display label title, Edit in header, Edit becomes Cancel+Save', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <ResourceViewPage
        config={{
          resourceName: 'Club',
          resourceDisplayName: 'Club',
          fetchResource,
          updateResource,
        }}
      />
    );

    await waitFor(() => {
      expect(getByTestId('app-layout-title')).toHaveTextContent('Club: Club A');
      expect(getByText('Edit')).toBeTruthy();
    });
    await waitForLinkedEntityDetection();
    expect(getByTestId('app-header-actions')).toBeTruthy();
    expect(getByTestId('resource-view-refresh')).toBeTruthy();
    expect(queryByText('Club Information')).toBeNull();

    fireEvent.press(getByText('Edit'));

    await waitFor(() => {
      expect(getByText('Cancel')).toBeTruthy();
      expect(getByText('Save')).toBeTruthy();
    });
    expect(queryByText('Refresh')).toBeNull();
  });

  it('externalChrome embedded: no body EditModeToggle', async () => {
    const onChromeStateChange = jest.fn();
    const { queryByText, getByText } = render(
      <ResourceViewPage
        config={{
          resourceName: 'Club',
          resourceDisplayName: 'Club',
          fetchResource,
          updateResource,
          embedded: true,
          externalChrome: true,
          onChromeStateChange,
        }}
      />
    );

    await waitFor(() => {
      expect(getByText('field:name')).toBeTruthy();
      expect(onChromeStateChange).toHaveBeenCalled();
      const lastCall = onChromeStateChange.mock.calls.at(-1)?.[0];
      expect(lastCall?.displayTitle).toBe('Club A');
    });
    expect(queryByText('Edit')).toBeNull();
  });
});
