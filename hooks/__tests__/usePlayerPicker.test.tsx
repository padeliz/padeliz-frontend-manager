import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { queryKeys } from '@/lib/queryClient';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';

const mockGetPlayers = jest.fn();
const mockGetPlayer = jest.fn();

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    getPlayers: (...args: unknown[]) => mockGetPlayers(...args),
    getPlayer: (...args: unknown[]) => mockGetPlayer(...args),
  })),
}));

import {
  PLAYER_PICKER_DEBOUNCE_MS,
  usePlayerPicker,
} from '@/hooks/usePlayerPicker';

function createWrapper() {
  const queryClient = createTestQueryClient({
    defaultOptions: {
      // Keep inactive picker queries long enough to match product staleTime
      // so clearing search reuses preload cache instead of refetching.
      queries: { retry: false, gcTime: 5 * 60_000 },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

async function advanceDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(PLAYER_PICKER_DEBOUNCE_MS);
  });
}

describe('usePlayerPicker', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;
  let activeUnmount: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlayers.mockResolvedValue({
      data: [{ id_player: 1, name: 'Alice' }],
    });
    mockGetPlayer.mockResolvedValue({
      data: { id_player: 99, name: 'Zed' },
    });
  });

  afterEach(async () => {
    activeUnmount?.();
    activeUnmount = null;
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
    jest.useRealTimers();
  });

  function mountHook(
    options: Parameters<typeof usePlayerPicker>[0] = {
      preloadCount: 100,
      selectedValue: null,
    }
  ) {
    const { wrapper, queryClient } = createWrapper();
    const hook = renderHook(() => usePlayerPicker(options), { wrapper });
    activeClient = queryClient;
    activeUnmount = hook.unmount;
    return { ...hook, queryClient };
  }

  it('preloads getPlayers with per_page capped at 100 and no q', async () => {
    mountHook({ preloadCount: 200, selectedValue: null });
    await waitFor(() => {
      expect(mockGetPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ per_page: 100, page: 1 })
      );
    });
    expect(mockGetPlayers.mock.calls[0][0].q).toBeUndefined();
  });

  it('sends q only after 2+ characters; short query does not', async () => {
    const { result } = mountHook({ preloadCount: 100, selectedValue: null });
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalledTimes(1));

    jest.useFakeTimers({ advanceTimers: true });

    await act(async () => {
      result.current.onSearch('a');
    });
    await advanceDebounce();
    expect(mockGetPlayers).toHaveBeenCalledTimes(1);
    expect(mockGetPlayers.mock.calls[0][0].q).toBeUndefined();

    mockGetPlayers.mockResolvedValue({
      data: [{ id_player: 2, name: 'Alice Two' }],
    });
    await act(async () => {
      result.current.onSearch('alice');
    });
    await advanceDebounce();
    await waitFor(() => {
      expect(mockGetPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'alice', per_page: 100 })
      );
    });
  });

  it('keeps the selected player in options when missing from the page', async () => {
    const { result } = mountHook({ preloadCount: 100, selectedValue: 99 });
    await waitFor(() => {
      expect(result.current.options.some(o => o.value === 99)).toBe(true);
    });
    expect(mockGetPlayer).toHaveBeenCalledWith(99);
    expect(result.current.options.some(o => o.label === 'Zed')).toBe(true);
  });

  it('uses distinct query keys for preload vs search so caches stay separate', async () => {
    const { result, queryClient } = mountHook({
      preloadCount: 100,
      selectedValue: null,
    });
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalledTimes(1));

    mockGetPlayers.mockResolvedValue({
      data: [{ id_player: 3, name: 'Bob' }],
    });

    jest.useFakeTimers({ advanceTimers: true });
    await act(async () => {
      result.current.onSearch('bob');
    });
    await advanceDebounce();
    await waitFor(() => {
      expect(mockGetPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'bob' })
      );
    });

    const keys = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['playersPicker'] })
      .map(q => q.queryKey);

    expect(keys).toEqual(
      expect.arrayContaining([
        queryKeys.playersPicker({
          q: undefined,
          page: 1,
          per_page: 100,
        }),
        queryKeys.playersPicker({ q: 'bob', page: 1, per_page: 100 }),
      ])
    );

    const preloadCalls = mockGetPlayers.mock.calls.length;
    await act(async () => {
      result.current.onSearch('');
    });
    await advanceDebounce();
    expect(mockGetPlayers.mock.calls.length).toBe(preloadCalls);
  });
});
