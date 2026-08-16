import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { queryKeys } from '@/lib/queryClient';

const mockGetPlayers = jest.fn();
const mockGetPlayer = jest.fn();

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    getPlayers: (...args: unknown[]) => mockGetPlayers(...args),
    getPlayer: (...args: unknown[]) => mockGetPlayer(...args),
  })),
}));

import { usePlayerPicker } from '@/hooks/usePlayerPicker';

function createWrapper(client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('usePlayerPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlayers.mockResolvedValue({
      data: [{ id_player: 1, name: 'Alice' }],
    });
    mockGetPlayer.mockResolvedValue({
      data: { id_player: 99, name: 'Zed' },
    });
  });

  it('preloads getPlayers with per_page capped at 100 and no q', async () => {
    const { wrapper } = createWrapper();
    renderHook(
      () => usePlayerPicker({ preloadCount: 200, selectedValue: null }),
      { wrapper }
    );
    await waitFor(() => {
      expect(mockGetPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ per_page: 100, page: 1 })
      );
    });
    expect(mockGetPlayers.mock.calls[0][0].q).toBeUndefined();
  });

  it('sends q only after 2+ characters; short query does not', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePlayerPicker({ preloadCount: 100, selectedValue: null }),
      { wrapper }
    );
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.onSearch('a');
      await new Promise(r => setTimeout(r, 400));
    });
    expect(mockGetPlayers).toHaveBeenCalledTimes(1);
    expect(mockGetPlayers.mock.calls[0][0].q).toBeUndefined();

    mockGetPlayers.mockResolvedValue({
      data: [{ id_player: 2, name: 'Alice Two' }],
    });
    await act(async () => {
      result.current.onSearch('alice');
    });
    await waitFor(() => {
      expect(mockGetPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'alice', per_page: 100 })
      );
    });
  });

  it('keeps the selected player in options when missing from the page', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePlayerPicker({ preloadCount: 100, selectedValue: 99 }),
      { wrapper }
    );
    await waitFor(() => {
      expect(result.current.options.some(o => o.value === 99)).toBe(true);
    });
    expect(mockGetPlayer).toHaveBeenCalledWith(99);
    expect(result.current.options.some(o => o.label === 'Zed')).toBe(true);
  });

  it('uses distinct query keys for preload vs search so caches stay separate', async () => {
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(
      () => usePlayerPicker({ preloadCount: 100, selectedValue: null }),
      { wrapper }
    );
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalledTimes(1));

    mockGetPlayers.mockResolvedValue({
      data: [{ id_player: 3, name: 'Bob' }],
    });
    await act(async () => {
      result.current.onSearch('bob');
    });
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
      await new Promise(r => setTimeout(r, 400));
    });
    expect(mockGetPlayers.mock.calls.length).toBe(preloadCalls);
  });
});
