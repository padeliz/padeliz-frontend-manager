import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
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
  USER_PICKER_DEBOUNCE_MS,
  useUserPicker,
} from '@/hooks/useUserPicker';
import { usePlayerPicker } from '@/hooks/usePlayerPicker';

function createWrapper() {
  const queryClient = createTestQueryClient({
    defaultOptions: {
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
    jest.advanceTimersByTime(USER_PICKER_DEBOUNCE_MS);
  });
}

describe('useUserPicker', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;
  let activeUnmount: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPlayers.mockResolvedValue({
      data: [{ id_user: 1, name: 'Alice' }],
    });
    mockGetPlayer.mockResolvedValue({
      data: { id_user: 99, name: 'Zed' },
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

  function mountUserPicker(
    options: Parameters<typeof useUserPicker>[0] = { role: 'player' }
  ) {
    const { wrapper, queryClient } = createWrapper();
    const hook = renderHook(() => useUserPicker(options), { wrapper });
    activeClient = queryClient;
    activeUnmount = hook.unmount;
    return { ...hook, queryClient };
  }

  it('player role omits has_user_type filter', async () => {
    mountUserPicker({ role: 'player', selectedValue: null });
    await waitFor(() => {
      expect(mockGetPlayers).toHaveBeenCalled();
    });
    const args = mockGetPlayers.mock.calls[0][0];
    expect(args.filters?.has_user_type).toBeUndefined();
  });

  it('manager role sends filters.has_user_type=manager', async () => {
    mountUserPicker({ role: 'manager', selectedValue: null });
    await waitFor(() => {
      expect(mockGetPlayers).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: { has_user_type: 'manager' },
        })
      );
    });
  });

  it('debounced search still works for manager role', async () => {
    const { result } = mountUserPicker({
      role: 'manager',
      selectedValue: null,
    });
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalledTimes(1));

    jest.useFakeTimers({ advanceTimers: true });
    mockGetPlayers.mockResolvedValue({
      data: [{ id_user: 2, name: 'Mgr Two' }],
    });
    await act(async () => {
      result.current.onSearch('mgr');
    });
    await advanceDebounce();
    await waitFor(() => {
      expect(mockGetPlayers).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'mgr',
          filters: { has_user_type: 'manager' },
        })
      );
    });
  });

  it('usePlayerPicker remains a player-role alias', async () => {
    const { wrapper, queryClient } = createWrapper();
    const hook = renderHook(() => usePlayerPicker({ selectedValue: null }), {
      wrapper,
    });
    activeClient = queryClient;
    activeUnmount = hook.unmount;

    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalled());
    const args = mockGetPlayers.mock.calls[0][0];
    expect(args.filters?.has_user_type).toBeUndefined();
  });
});
