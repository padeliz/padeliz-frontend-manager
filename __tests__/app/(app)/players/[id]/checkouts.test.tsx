/**
 * @jest-environment jsdom
 */
import PlayerCheckoutsPage from '@/app/(app)/players/[id]/checkouts';
import { render } from '@testing-library/react-native';
import React from 'react';

const mockList = jest.fn();
let mockParams: { id?: string } = { id: '42' };

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useLocalSearchParams: () => mockParams,
  })
);

jest.mock('@/components/registrations/RegistrationQueueList', () => {
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { queue?: string; playerId?: number }) => {
      mockList(props);
      return (
        <View testID="player-checkouts-list">
          <Text>{String(props.playerId)}</Text>
        </View>
      );
    },
  };
});

describe('Player checkouts page', () => {
  beforeEach(() => {
    mockList.mockClear();
    mockParams = { id: '42' };
  });

  it('lists the route player checkouts with no queue', () => {
    const { getByTestId } = render(<PlayerCheckoutsPage />);

    expect(getByTestId('player-checkouts-list')).toBeTruthy();
    expect(mockList).toHaveBeenCalledWith({ playerId: 42 });
  });

  it('renders nothing for an invalid player id', () => {
    mockParams = { id: 'abc' };
    const { queryByTestId } = render(<PlayerCheckoutsPage />);

    expect(queryByTestId('player-checkouts-list')).toBeNull();
    expect(mockList).not.toHaveBeenCalled();
  });
});
