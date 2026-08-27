/**
 * @jest-environment jsdom
 */
import EditionLotteryPrizesPage from '@/app/(app)/edition-lottery-prizes/index';
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

describe('Lottery prizes list', () => {
  it('uses ResourceListPage with EditionLotteryPrize resource', () => {
    render(<EditionLotteryPrizesPage />);
    expect(screen.getByTestId('resource-list').props.children).toBe(
      'EditionLotteryPrize'
    );
  });
});
