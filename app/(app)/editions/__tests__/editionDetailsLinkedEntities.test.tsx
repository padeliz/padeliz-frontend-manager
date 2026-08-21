/**
 * @jest-environment jsdom
 */
import EditionDetailsRoute from '@/app/(app)/editions/[id]/details';
import { render } from '@testing-library/react-native';
import React from 'react';

let lastViewConfig: any;

jest.mock('@/components/pages/ResourceViewPage', () => ({
  __esModule: true,
  default: jest.fn(({ config }: any) => {
    lastViewConfig = config;
    const React = require('react');
    const { Text } = require('react-native');
    return <Text testID="edition-details-view">view</Text>;
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: '36' }),
}));

jest.mock('@/components/chrome/PageChromeProvider', () => ({
  useRegisterPageActions: jest.fn(),
}));

jest.mock('@/services/api/editionsApi', () => ({
  EditionsApiService: jest.fn().mockImplementation(() => ({
    getEdition: jest.fn(),
    updateEdition: jest.fn(),
  })),
}));

describe('Edition Details linked entities', () => {
  it('excludes the divisions linked entity, which has its own tab', () => {
    render(<EditionDetailsRoute />);
    expect(lastViewConfig.resourceName).toBe('Edition');
    expect(lastViewConfig.showLinkedEntities).toBe(true);
    expect(lastViewConfig.excludeLinkedEntities).toContain('divisions');
    expect(lastViewConfig.excludeLinkedEntities).toContain('edition_divisions');
  });
});
