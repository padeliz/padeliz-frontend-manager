import ViewPlayerCustomFieldPage from '@/app/(app)/player-custom-fields/[id]';
import fs from 'fs';
import path from 'path';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));

jest.mock('@/context/managerAuth', () => ({
  useAuth: () => ({
    user: { id_player: 1, name: 'Mgr' },
  }),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '3' }),
  usePathname: () => '/player-custom-fields/3',
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/components/layout/TopNavigation', () => {
  const { View } = require('react-native');
  return () => <View />;
});
jest.mock('@/components/layout/Sidebar', () => {
  const { View } = require('react-native');
  return () => <View />;
});

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => ({
      display_field: 'name',
      swagger_schema: {
        required: [],
        properties: {
          id_player_custom_field: {
            type: 'integer',
            format: 'int64',
            readOnly: true,
            title: 'ID',
            description: 'Unique Identifier',
          },
          name: { type: 'string', title: 'Name' },
        },
      },
      searchable_fields: [],
      filterable_fields: {},
      sortable_fields: [],
      request_body: {},
      schema_name: 'PlayerCustomField',
      resource_path: 'player-custom-fields',
      version: '1',
    }),
    getError: () => null,
    isLoading: () => false,
    fetchMetadata: jest.fn(),
  }),
}));

jest.mock('@/services/api/playerCustomFieldsApi', () => ({
  PlayerCustomFieldsApiService: jest.fn().mockImplementation(() => ({
    getPlayerCustomField: jest.fn(async () => ({
      data: {
        id_player_custom_field: 3,
        name: 'Handedness',
        type: 'text',
        archived_at: null,
      },
    })),
    updatePlayerCustomField: jest.fn(),
    archivePlayerCustomField: jest.fn(),
    unarchivePlayerCustomField: jest.fn(),
  })),
}));

jest.mock('@/components/pages/ResourceViewPage', () => {
  const React = require('react');
  const { useRegisterPageActions } = require('@/components/chrome/PageChromeProvider');
  const { Text, View } = require('react-native');
  return function MockView({ config }: any) {
    useRegisterPageActions({
      refresh: async () => {},
      edit: () => {},
      cancel: () => {},
      save: async () => {},
      isEditing: false,
      isSaving: false,
      canSave: false,
      isDirty: false,
      displayTitle: 'Handedness',
    });
    return (
      <View testID="embedded-view">
        <Text>{config.embedded ? 'embedded' : 'full'}</Text>
      </View>
    );
  };
});

jest.mock('@/components/playerCustomFields/PlayerCustomFieldOptionsPanel', () => {
  const { View } = require('react-native');
  return () => <View testID="options-panel" />;
});

describe('player-custom-fields/[id]', () => {
  it('uses formatted Page Header, raw crumb label, no wrapper ScrollView', async () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '[id].tsx'),
      'utf8'
    );
    expect(src).not.toMatch(/ScrollView/);
    expect(src).toContain('formatResourceHeaderTitle');

    const { queryByTestId, getByTestId, getByText } = render(
      <ViewPlayerCustomFieldPage />
    );

    expect(queryByTestId('player-custom-field-back')).toBeNull();
    expect(queryByTestId('custom-field-content-scroll')).toBeNull();
    await waitFor(() => {
      expect(getByTestId('player-custom-field-archive-toggle')).toBeTruthy();
      expect(getByText('Custom field: Handedness')).toBeTruthy();
      expect(getByTestId('embedded-view')).toBeTruthy();
    });
  });
});
