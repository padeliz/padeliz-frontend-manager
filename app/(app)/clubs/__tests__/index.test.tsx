/**
 * @jest-environment jsdom
 */
import ClubsPage from '@/app/(app)/clubs/index';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

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

describe('Clubs list', () => {
  it('uses ResourceListPage with Club resource', () => {
    render(<ClubsPage />);
    expect(screen.getByTestId('resource-list').props.children).toBe('Club');
  });
});
