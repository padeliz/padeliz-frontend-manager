/**
 * @jest-environment jsdom
 */
import SponsorPrizesPage from '@/app/(app)/sponsor-prizes/index';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
})
);

jest.mock('@/components/pages/ResourceListPage', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ config }: any) => (
      <Text testID="resource-list">{config.resourceName}</Text>
    ),
  };
});

describe('Sponsor prizes list', () => {
  it('uses ResourceListPage with SponsorPrize resource', () => {
    render(<SponsorPrizesPage />);
    expect(screen.getByTestId('resource-list').props.children).toBe(
      'SponsorPrize'
    );
  });
});
