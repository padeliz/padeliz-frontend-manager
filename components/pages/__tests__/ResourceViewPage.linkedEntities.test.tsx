/**
 * @jest-environment jsdom
 */
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: '36' }),
})
);

const eventMetadata = {
  display_field: 'name',
  resource_path: 'events',
  schema_name: 'Event',
  swagger_schema: {
    properties: {
      id_event: { type: 'integer', readOnly: true },
      name: { type: 'string', title: 'Name' },
    },
  },
  filterable_fields: {},
  searchable_fields: ['name'],
  sortable_fields: ['name'],
};

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => eventMetadata,
    getError: () => null,
    isLoading: () => false,
    fetchMetadata: jest.fn(),
  }),
}));

jest.mock('@/components/ui/LoadingSpinner', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text>loading</Text> };
});

jest.mock('@/components/ui/ManagerFileUpload', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View /> };
});

jest.mock('@/components/layout/AppLayout', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="app-layout">{children}</View>,
  };
});

jest.mock('@/utils/linkedEntityService', () => ({
  LinkedEntityService: {
    detectLinkedEntities: jest.fn(async () => [
      { key: 'divisions', label: 'Divisions', resourceName: 'EventDivision' },
      {
        key: 'participations',
        label: 'Participations',
        resourceName: 'EventParticipation',
      },
    ]),
  },
}));

jest.mock('@/components/pages/LinkedEntitySection', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ config }: any) => (
      <View testID={`linked-entity-${config.key}`} />
    ),
  };
});

jest.mock('@/components/pages/ResourceFieldDisplay', () => {
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
  data: { id_event: 36, name: 'Event 36' },
}));

function renderView(excludeLinkedEntities?: string[]) {
  return render(
    <ResourceViewPage
      config={{
        resourceName: 'Event',
        resourceDisplayName: 'Event',
        fetchResource,
        title: 'Event Details',
        excludeLinkedEntities,
      }}
    />
  );
}

async function waitForLinkedEntityDetectionSettled() {
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
    await Promise.resolve();
  });
}

describe('ResourceViewPage linked entity exclusions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not loop linked-entity detection when excludeLinkedEntities is omitted', async () => {
    const { LinkedEntityService } = require('@/utils/linkedEntityService');
    const detectSpy = LinkedEntityService.detectLinkedEntities as jest.Mock;

    const { findByTestId } = render(
      <ResourceViewPage
        config={{
          resourceName: 'Player',
          resourceDisplayName: 'Player',
          fetchResource,
          embedded: true,
          showLinkedEntities: true,
          resourceIdOverride: 748,
          title: 'Player Details',
        }}
      />
    );

    expect(await findByTestId('linked-entity-divisions')).toBeTruthy();
    await waitForLinkedEntityDetectionSettled();
    expect(detectSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(detectSpy.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('renders every detected linked entity by default', async () => {
    const { findByTestId } = renderView();
    expect(await findByTestId('linked-entity-divisions')).toBeTruthy();
    expect(await findByTestId('linked-entity-participations')).toBeTruthy();
    await waitForLinkedEntityDetectionSettled();
  });

  it('hides excluded linked entities', async () => {
    const { findByTestId, queryByTestId } = renderView(['divisions']);
    expect(await findByTestId('linked-entity-participations')).toBeTruthy();
    await waitFor(() => {
      expect(queryByTestId('linked-entity-divisions')).toBeNull();
    });
    await waitForLinkedEntityDetectionSettled();
  });
});
