import {
  isCompatibleChallengeDoc,
  loadChallengeDoc,
  saveChallengeDoc,
  clearChallengeDoc,
} from '../localStore';
import { emptyBoard } from '../types';

const mockMemory = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockMemory.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockMemory.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockMemory.delete(key);
    }),
    clear: jest.fn(async () => {
      mockMemory.clear();
    }),
  },
}));

describe('localStore compatibility', () => {
  beforeEach(() => {
    mockMemory.clear();
  });

  it('rejects legacy docs with outbox or missing dirty/inserted_at', () => {
    expect(
      isCompatibleChallengeDoc({
        state: { session: { id_challenge_session: 1 } },
        state_sequence: 1,
        actions: [],
        outbox: [],
      })
    ).toBe(false);
    expect(
      isCompatibleChallengeDoc({
        state: {
          session: {
            id_challenge_session: 1,
            type: 'king_of_the_court',
            status: 'active',
          },
        },
        state_sequence: 1,
        actions: [],
        dirty: true,
      })
    ).toBe(false);
  });

  it('loads null for incompatible stored JSON', async () => {
    mockMemory.set(
      'challenge-session:9',
      JSON.stringify({
        state: {},
        state_sequence: 1,
        actions: [],
        outbox: [],
      })
    );
    expect(await loadChallengeDoc(9)).toBeNull();
  });

  it('round-trips a compatible doc', async () => {
    const doc = {
      state: emptyBoard({
        id_challenge_session: 9,
        type: 'king_of_the_court' as const,
        status: 'active' as const,
        title: 'King of the Court Live Session',
        bottom_text: 'King of the Court Live Session',
        started_at: 1,
        completed_at: null,
        inserted_at: 1,
      }),
      state_sequence: 2,
      actions: [],
      dirty: true,
    };
    await saveChallengeDoc(9, doc);
    expect(await loadChallengeDoc(9)).toEqual(doc);
    await clearChallengeDoc(9);
    expect(await loadChallengeDoc(9)).toBeNull();
  });
});
