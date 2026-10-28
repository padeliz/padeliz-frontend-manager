/**
 * @jest-environment jsdom
 */
import PlayerImportViewPage from '@/app/(app)/players/(hub)/import-players/imports/[id]';
import PlayerImportsListPage from '@/app/(app)/players/(hub)/import-players/imports/index';
import { render } from '@testing-library/react-native';
import React from 'react';

let lastListConfig: any;
let lastViewConfig: any;

jest.mock('@/components/pages/ResourceListPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    lastListConfig = config;
    const React = require('react');
    const { Text } = require('react-native');
    return <Text testID="imports-list">list</Text>;
  },
}));

jest.mock('@/components/pages/ResourceViewPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    lastViewConfig = config;
    const React = require('react');
    const { Text } = require('react-native');
    return <Text testID="imports-view">view</Text>;
  },
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ id: '9' }),
})
);

jest.mock('@/components/chrome/PageChromeProvider', () => ({
  useRegisterPageActions: jest.fn(),
}));

jest.mock('@/services/api/userImportApi', () => ({
  UserImportApiService: jest.fn().mockImplementation(() => ({
    getImports: jest.fn(),
    getImport: jest.fn(),
  })),
}));

describe('Players Imports tab', () => {
  it('omits Add and bulk delete on the list', () => {
    render(<PlayerImportsListPage />);
    expect(lastListConfig.onAdd).toBeUndefined();
    expect(
      (lastListConfig.bulkActions || []).some((a: any) => a.action === 'delete')
    ).toBe(false);
    expect(lastListConfig.embedded).toBe(true);
  });

  it('omits updateResource and shows linked entities on the detail page', () => {
    render(<PlayerImportViewPage />);
    expect(lastViewConfig.updateResource).toBeUndefined();
    expect(lastViewConfig.showLinkedEntities).toBe(true);
    expect(lastViewConfig.embedded).toBe(true);
    expect(lastViewConfig.resourceIdOverride).toBe(9);
  });
});
