jest.mock('@/lib/challenges/syncEngine', () => ({
  hydrateSession: jest.fn(),
  scheduleFlush: jest.fn(),
  attachSyncStatus: jest.fn(),
  registerUnloadGuards: jest.fn(() => ({ dispose: jest.fn() })),
  SessionUnavailableError: class SessionUnavailableError extends Error {
    constructor(message?: string) {
      super(message);
      this.name = 'SessionUnavailableError';
    }
  },
}));

jest.mock('@/lib/challenges/localStore', () => ({
  saveChallengeDoc: jest.fn(),
}));

jest.mock('@/lib/challenges/kotcReducer', () => ({
  reduceKotc: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useChallengeSession } from '../useChallengeSession';
import { hydrateSession, scheduleFlush } from '@/lib/challenges/syncEngine';
import { reduceKotc } from '@/lib/challenges/kotcReducer';
import { emptyBoard } from '@/lib/challenges/types';
import type { ChallengeLocalDocument } from '@/lib/challenges/types';

const hydrateMock = hydrateSession as jest.Mock;
const scheduleFlushMock = scheduleFlush as jest.Mock;
const reduceKotcMock = reduceKotc as jest.Mock;

function doc(): ChallengeLocalDocument {
  return {
    state: emptyBoard({
      id_challenge_session: 1,
      type: 'king_of_the_court',
      status: 'active',
      title: 'King of the Court Live Session',
      bottom_text: 'King of the Court Live Session',
      started_at: 1,
      completed_at: null,
      inserted_at: 1,
    }),
    state_sequence: 0,
    actions: [],
    dirty: false,
  };
}

describe('useChallengeSession', () => {
  beforeEach(() => {
    hydrateMock.mockReset();
    scheduleFlushMock.mockReset();
    reduceKotcMock.mockReset();
    hydrateMock.mockResolvedValue({ doc: doc(), shouldFlush: false });
  });

  it('returns domain error for duplicate_active without setting session error', async () => {
    const { result } = renderHook(() => useChallengeSession(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    reduceKotcMock.mockReturnValue({
      message: 'Duplicate',
      code: 'duplicate_active',
      duplicate: { id: 't1', location: 'waiting' },
    });

    let domain: unknown;
    await act(async () => {
      domain = await result.current.runKotc({
        type: 'add_team',
        name: 'Team Alpha One',
      });
    });

    expect(domain).toMatchObject({ code: 'duplicate_active' });
    expect(result.current.error).toBeNull();
  });

  it('sets error for other domain failures', async () => {
    const { result } = renderHook(() => useChallengeSession(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    reduceKotcMock.mockReturnValue({ message: 'Waiting is full' });

    await act(async () => {
      await result.current.runKotc({ type: 'add_team', name: 'Team Alpha One' });
    });

    expect(result.current.error).toBe('Waiting is full');
  });
});
