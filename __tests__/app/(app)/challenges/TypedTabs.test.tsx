import ChallengeSessionList from '@/components/challenges/ChallengeSessionList';
import { challengesApi } from '@/services/api/challengesApi';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: mockPush }),
})
);

jest.mock('@/components/chrome/PageChromeProvider', () => ({
  useRegisterPageActions: jest.fn(),
}));

jest.mock('@/services/api/challengesApi', () => ({
  challengesApi: {
    list: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('@/lib/challenges/syncEngine', () => ({
  seedLocalFromCreate: jest.fn(async () => undefined),
}));

const listMock = challengesApi.list as jest.Mock;
const createMock = challengesApi.create as jest.Mock;

describe('Challenge typed tabs', () => {
  let client = createTestQueryClient();

  afterEach(async () => {
    await disposeTestQueryClient(client);
    client = createTestQueryClient();
    mockPush.mockClear();
    jest.clearAllMocks();
  });

  it('shows active session card when one exists', async () => {
    listMock.mockResolvedValue({
      data: [
        {
          id_challenge_session: 5,
          type: 'king_of_the_court',
          status: 'active',
          title: 'Active KOTC',
          started_at: 1,
          completed_at: null,
        },
      ],
    });

    const { getByTestId } = render(
      <QueryClientProvider client={client}>
        <ChallengeSessionList type="king_of_the_court" showCreate />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(getByTestId('challenge-active-session-card')).toBeTruthy()
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('create navigates to live panel when no active session', async () => {
    listMock.mockResolvedValue({ data: [] });
    createMock.mockResolvedValue({
      data: {
        id_challenge_session: 9,
        type: 'smash_contest',
        status: 'active',
        title: 'Smash Contest Live Session XX',
        started_at: 1,
        completed_at: null,
        inserted_at: 1,
      },
    });

    const { getByTestId } = render(
      <QueryClientProvider client={client}>
        <ChallengeSessionList type="smash_contest" showCreate />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(getByTestId('challenge-create-button')).toBeTruthy()
    );
    fireEvent.press(getByTestId('challenge-create-button'));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/challenges/smash/9')
    );
  });
});
