/**
 * @jest-environment jsdom
 */
import ResourceViewPage from '@/components/pages/ResourceViewPage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
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

  it('retries the failed load through an ActionButton', async () => {
    const failingFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('Load failed'))
      .mockResolvedValue({ data: { id_club: 1, name: 'Club A' } });

    const { getByTestId, getByText, findByText } = render(
      <ResourceViewPage
        config={{
          resourceName: 'Club',
          resourceDisplayName: 'Club',
          fetchResource: failingFetch,
        }}
      />
    );

    expect(await findByText('Load failed')).toBeTruthy();
    const retry = getByTestId('resource-view-retry');

    await act(async () => {
      fireEvent.press(retry);
    });

    await waitFor(() => {
      expect(failingFetch).toHaveBeenCalledTimes(2);
      expect(getByText('field:name')).toBeTruthy();
    });
  });

  it('reuses the refresh status hook for the retry button', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'ResourceViewPage.tsx'),
      'utf8'
    );
    expect(src).toContain('testID="resource-view-retry"');
    expect(src).toContain('successHoldMs: 4000');
    expect(src).toMatch(
      /label="Retry"[\s\S]*?status=\{refreshButtonStatus\}[\s\S]*?testID="resource-view-retry"/
    );
    expect(src.match(/useActionButtonStatus\(/g)).toHaveLength(1);
    expect(src).not.toContain('auditoryFeedback');
    expect(src).not.toMatch(/onPress=\{handleRefresh\}/);
  });

  it('publishes a Save action that rejects when update fails', async () => {
    const onChromeStateChange = jest.fn();
    const updateError = new Error('Update failed');
    const failingUpdate = jest.fn(async () => {
      throw updateError;
    });

    render(
      <ResourceViewPage
        config={{
          resourceName: 'Club',
          resourceDisplayName: 'Club',
          fetchResource,
          updateResource: failingUpdate,
          embedded: true,
          externalChrome: true,
          onChromeStateChange,
        }}
      />
    );

    // edit is only published after the resource has loaded
    await waitFor(() => {
      expect(onChromeStateChange.mock.calls.at(-1)?.[0].edit).toBeDefined();
      expect(onChromeStateChange.mock.calls.at(-1)?.[0].displayTitle).toBe(
        'Club A'
      );
    });
    act(() => {
      onChromeStateChange.mock.calls.at(-1)?.[0].edit();
    });
    await waitFor(() => {
      expect(onChromeStateChange.mock.calls.at(-1)?.[0].isEditing).toBe(true);
    });

    const save = onChromeStateChange.mock.calls.at(-1)?.[0].save;
    let rejected: unknown;
    await act(async () => {
      try {
        await save();
      } catch (error) {
        rejected = error;
      }
    });
    expect(rejected).toBe(updateError);
    expect(failingUpdate).toHaveBeenCalled();
  });
});
