import {
  applyUpsertAck,
  flushStatePass,
  resetFlushSchedulerForTests,
  scheduleFlush,
} from '../flushScheduler';
import { LOCAL_ACTION_WINDOW, trimActionsForStatus } from '../localStore';
import { emptyBoard } from '../types';
import type { ChallengeActionRecord, ChallengeLocalDocument } from '../types';
import { buildSyncBody } from '../syncPayload';

const mockStore = new Map<number, ChallengeLocalDocument>();

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

const mockSync = jest.fn();
jest.mock('@/services/api/challengesApi', () => ({
  challengesApi: {
    sync: (...args: unknown[]) => mockSync(...args),
  },
}));

function baseDoc(
  overrides: Partial<ChallengeLocalDocument> = {}
): ChallengeLocalDocument {
  const state = emptyBoard({
    id_challenge_session: 1,
    type: 'king_of_the_court',
    status: 'active',
    title: 'King of the Court Live Session',
    bottom_text: 'King of the Court Live Session',
    started_at: 10,
    completed_at: null,
    inserted_at: 10,
  });
  return {
    state,
    state_sequence: 1,
    actions: [],
    dirty: true,
    ...overrides,
  };
}

describe('LOCAL_ACTION_WINDOW', () => {
  it('is 25', () => {
    expect(LOCAL_ACTION_WINDOW).toBe(25);
  });
});

describe('trimActionsForStatus', () => {
  function fakeAction(seq: number): ChallengeActionRecord {
    const state = emptyBoard({
      id_challenge_session: 1,
      type: 'king_of_the_court',
      status: 'active',
      title: 'King of the Court Live Session',
      bottom_text: 'King of the Court Live Session',
      started_at: 1,
      completed_at: null,
      inserted_at: 1,
    });
    return {
      client_action_id: `id-${seq}`,
      sequence_number: seq,
      action_type: 'participant_added',
      before_state: state,
      payload: null,
      payload_summary: '',
      occurred_at: seq,
    };
  }

  it('trims active to last 25', () => {
    const actions = Array.from({ length: 26 }, (_, i) => fakeAction(i + 1));
    const trimmed = trimActionsForStatus(actions, 'active');
    expect(trimmed).toHaveLength(25);
    expect(trimmed[0].sequence_number).toBe(2);
  });

  it('does not trim completed even when longer than 25', () => {
    const actions = Array.from({ length: 30 }, (_, i) => fakeAction(i + 1));
    expect(trimActionsForStatus(actions, 'completed')).toHaveLength(30);
  });
});

describe('flushScheduler', () => {
  beforeEach(() => {
    mockStore.clear();
    mockSync.mockReset();
    resetFlushSchedulerForTests();
  });

  it('applyUpsertAck clears dirty only when sequences match', () => {
    const current = baseDoc({ state_sequence: 5, dirty: true });
    expect(applyUpsertAck(current, 5).dirty).toBe(false);
    expect(applyUpsertAck(current, 4).dirty).toBe(true);
  });

  it('builds full-row sync body from doc', () => {
    const doc = baseDoc({ state_sequence: 3 });
    const body = buildSyncBody(doc);
    expect(body).toMatchObject({
      id_challenge_session: 1,
      type: 'king_of_the_court',
      status: 'active',
      title: doc.state.session.title,
      bottom_text: doc.state.session.bottom_text,
      started_at: 10,
      completed_at: null,
      inserted_at: 10,
      state_sequence: 3,
    });
    expect(body.state_json).toBe(doc.state);
  });

  it('serializes rapid flushes into one POST then a coalesced second', async () => {
    let resolveFirst!: (v: unknown) => void;
    const first = new Promise(resolve => {
      resolveFirst = resolve;
    });
    let calls = 0;
    mockSync.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        await first;
      }
      return { data: { state_sequence: calls } };
    });

    mockStore.set(1, baseDoc({ state_sequence: 1, dirty: true }));
    const p1 = scheduleFlush(1);
    mockStore.set(1, baseDoc({ state_sequence: 2, dirty: true }));
    const p2 = scheduleFlush(1);
    resolveFirst({ data: { state_sequence: 1 } });
    await Promise.all([p1, p2]);

    expect(mockSync.mock.calls.length).toBeGreaterThanOrEqual(2);
    const saved = mockStore.get(1)!;
    expect(saved.dirty).toBe(false);
    expect(saved.state_sequence).toBe(2);
  });

  it('stale ack does not clear newer dirty', async () => {
    mockSync.mockImplementationOnce(async () => {
      mockStore.set(1, baseDoc({ state_sequence: 2, dirty: true }));
      return { data: { id_challenge_session: 1, state_sequence: 1 } };
    });
    mockStore.set(1, baseDoc({ state_sequence: 1, dirty: true }));
    await flushStatePass(1, mockStore.get(1)!);
    expect(mockStore.get(1)!.dirty).toBe(true);
    expect(mockStore.get(1)!.state_sequence).toBe(2);
  });

  it('failure keeps dirty', async () => {
    mockSync.mockRejectedValueOnce(new Error('network'));
    mockStore.set(1, baseDoc({ dirty: true }));
    await scheduleFlush(1);
    expect(mockStore.get(1)!.dirty).toBe(true);
  });
});
