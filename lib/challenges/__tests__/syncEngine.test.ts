import { hydrateSession, SessionUnavailableError } from '../syncEngine';
import { emptyBoard } from '../types';
import type { ChallengeLocalDocument } from '../types';

const mockStore = new Map<number, ChallengeLocalDocument>();
const mockGetState = jest.fn();

jest.mock('@/lib/challenges/localStore', () => {
  const actual = jest.requireActual('@/lib/challenges/localStore');
  return {
    ...actual,
    loadChallengeDoc: jest.fn(async (id: number) => mockStore.get(id) ?? null),
    saveChallengeDoc: jest.fn(async (id: number, doc: ChallengeLocalDocument) => {
      mockStore.set(id, doc);
    }),
  };
});

jest.mock('@/services/api/challengesApi', () => ({
  challengesApi: {
    getState: (...args: unknown[]) => mockGetState(...args),
  },
}));

describe('hydrateSession', () => {
  beforeEach(() => {
    mockStore.clear();
    mockGetState.mockReset();
  });

  it('prefers valid local and does not GET', async () => {
    const local: ChallengeLocalDocument = {
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
      state_sequence: 4,
      actions: [],
      dirty: true,
    };
    mockStore.set(1, local);
    const result = await hydrateSession(1);
    expect(mockGetState).not.toHaveBeenCalled();
    expect(result.doc).toEqual(local);
    expect(result.shouldFlush).toBe(true);
  });

  it('GETs when local missing and seeds dirty false with inserted_at', async () => {
    mockGetState.mockResolvedValue({
      data: {
        session: {
          id_challenge_session: 2,
          type: 'smash_contest',
          status: 'active',
          title: 'Smash Contest Live Session XX',
          bottom_text: 'Smash Contest Live Session XX',
          started_at: 5,
          completed_at: null,
          inserted_at: 5,
          state_sequence: 0,
        },
        state_json: { waiting: [], participants: [] },
        state_sequence: 0,
      },
    });
    const result = await hydrateSession(2);
    expect(result.doc.dirty).toBe(false);
    expect(result.doc.actions).toEqual([]);
    expect(result.doc.state.session.inserted_at).toBe(5);
    expect(result.shouldFlush).toBe(false);
  });

  it('throws SessionUnavailableError on GET 404', async () => {
    mockGetState.mockRejectedValue({ status: 404, message: 'Not found' });
    await expect(hydrateSession(3)).rejects.toBeInstanceOf(
      SessionUnavailableError
    );
  });
});
