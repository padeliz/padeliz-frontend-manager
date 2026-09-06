/**
 * @jest-environment jsdom
 */
import ChallengeSessionList from '@/components/challenges/ChallengeSessionList';
import { createTestQueryClient } from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockList = jest.fn();
const mockCreate = jest.fn();
const mockSeedLocalFromCreate = jest.fn(
  async (..._args: unknown[]) => undefined
);
const mockPush = jest.fn();

jest.mock('@/services/api/challengesApi', () => ({
  challengesApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

jest.mock('@/lib/challenges/syncEngine', () => ({
  seedLocalFromCreate: (...args: unknown[]) => mockSeedLocalFromCreate(...args),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ push: (...args: unknown[]) => mockPush(...args) }),
  })
);

function renderList(props: Record<string, unknown> = {}) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ChallengeSessionList
        type="king_of_the_court"
        showCreate
        {...(props as any)}
      />
    </QueryClientProvider>
  );
}

describe('ChallengeSessionList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue({ data: [] });
    mockCreate.mockResolvedValue({
      data: {
        id_challenge_session: 31,
        type: 'king_of_the_court',
        title: 'KOTC #31',
        status: 'active',
        started_at: 1700000000,
        completed_at: null,
      },
    });
  });

  it('creates a session, seeds local state and navigates', async () => {
    const { findByTestId } = renderList();

    fireEvent.press(await findByTestId('challenge-create-button'));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith('king_of_the_court')
    );
    expect(mockSeedLocalFromCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id_challenge_session: 31 })
    );
    expect(mockPush).toHaveBeenCalledWith('/challenges/kotc/31');
    expect(await findByTestId('challenge-create-button-success')).toBeTruthy();
  });

  it('reports create failures on the button instead of navigating', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Session limit reached'));
    const { findByTestId, getByTestId } = renderList();

    fireEvent.press(await findByTestId('challenge-create-button'));

    expect(await findByTestId('challenge-create-button-error')).toBeTruthy();
    expect(getByTestId('challenge-create-button-tooltip')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockSeedLocalFromCreate).not.toHaveBeenCalled();
  });

  it('shows the active session card instead of the create button', async () => {
    mockList.mockResolvedValue({
      data: [
        {
          id_challenge_session: 9,
          type: 'king_of_the_court',
          title: 'Running KOTC',
          status: 'active',
          started_at: 1700000000,
          completed_at: null,
        },
      ],
    });

    const { findByTestId, queryByTestId } = renderList();

    const card = await findByTestId('challenge-active-session-card');
    expect(queryByTestId('challenge-create-button')).toBeNull();

    fireEvent.press(card);
    expect(mockPush).toHaveBeenCalledWith('/challenges/kotc/9');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('navigates from a session row without an ActionButton', async () => {
    mockList.mockResolvedValue({
      data: [
        {
          id_challenge_session: 12,
          type: 'smash_contest',
          title: 'Smash night',
          status: 'completed',
          started_at: 1700000000,
          completed_at: 1700003600,
        },
      ],
    });

    const { findByTestId } = renderList({ showCreate: false, type: undefined });

    fireEvent.press(await findByTestId('challenge-session-row-12'));
    expect(mockPush).toHaveBeenCalledWith('/challenges/smash/12');
  });

  it('drives the create action through ActionButton with auditory feedback', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'ChallengeSessionList.tsx'),
      'utf8'
    );
    expect(src).toContain(
      "import ActionButton from '@/components/ui/ActionButton'"
    );
    expect(src).toContain(
      'const createStatus = useActionButtonStatus({ auditoryFeedback: true });'
    );
    expect(src).toContain('testID="challenge-create-button"');
    expect(src).toContain('void createStatus.run(handleCreate)');
    expect(src).not.toContain('successHoldMs');
  });
});
