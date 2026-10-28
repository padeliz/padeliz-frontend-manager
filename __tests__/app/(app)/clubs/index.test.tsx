/**
 * @jest-environment jsdom
 */
import ClubsPage from '@/app/(app)/clubs/index';
import { render } from '@testing-library/react-native';
import React from 'react';

let lastConfig: any;

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
})
);

jest.mock('@/components/pages/ResourceListPage', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ config }: any) => {
      lastConfig = config;
      return null;
    },
  };
});

describe('Clubs list', () => {
  it('passes clean title and section breadcrumbs to ResourceListPage', () => {
    render(<ClubsPage />);
    expect(lastConfig.resourceName).toBe('Club');
    expect(lastConfig.title).toBe('Clubs');
    expect(lastConfig.sectionLabel).toBe('Clubs');
    expect(lastConfig.sectionHref).toBe('/clubs');
  });
});
