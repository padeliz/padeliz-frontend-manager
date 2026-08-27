import { registerUnloadGuards, keepaliveUpsert } from '../flushScheduler';
import type { ChallengeLocalDocument } from '../types';
import { emptyBoard } from '../types';

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

jest.mock('@/utils/storage', () => ({
  storageUtils: {
    get: jest.fn(async () => 'test-token'),
  },
}));

describe('unload guards', () => {
  beforeEach(() => {
    mockStore.clear();
    (global as { fetch?: typeof fetch }).fetch = jest.fn(async () =>
      Promise.resolve(new Response(null, { status: 200 }))
    ) as typeof fetch;
  });

  it('registers beforeunload warn when dirty and calls keepalive fetch', async () => {
    mockStore.set(1, {
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
      state_sequence: 2,
      actions: [],
      dirty: true,
    });

    const listeners: Record<string, EventListener[]> = {};
    const add = jest.fn((type: string, fn: EventListener) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(fn);
    });
    const remove = jest.fn();
    (global as { window: Window }).window = {
      addEventListener: add,
      removeEventListener: remove,
    } as unknown as Window;

    const guard = registerUnloadGuards(1, () => true);
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(add).toHaveBeenCalledWith('pagehide', expect.any(Function));

    const before = listeners.beforeunload[0];
    const event = { preventDefault: jest.fn(), returnValue: '' };
    before(event as unknown as Event);
    expect(event.preventDefault).toHaveBeenCalled();

    await keepaliveUpsert(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/challenges/1/sync'),
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );

    guard.dispose();
    expect(remove).toHaveBeenCalled();
  });
});
