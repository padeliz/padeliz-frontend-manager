import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';

const mockGetLotteries = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};
let mockGlobalParams: Record<string, string | undefined> = {};

jest.mock('@/services/api/eventLotteriesApi', () => ({
  EventLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: (...args: unknown[]) => mockGetLotteries(...args),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useLocalSearchParams: () => mockSearchParams,
    useGlobalSearchParams: () => mockGlobalParams,
  })
);

import { useEventLotterySelection } from '@/hooks/useEventLotterySelection';

function createWrapper() {
  const queryClient = createTestQueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('useEventLotterySelection', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;
  let activeUnmount: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    mockGlobalParams = {};
    mockGetLotteries.mockResolvedValue({
      data: [
        { id_lottery: 3, name: 'Alpha', display_order: 0 },
        { id_lottery: 9, name: 'Zebra', display_order: 1 },
      ],
    });
  });

  afterEach(async () => {
    activeUnmount?.();
    activeUnmount = null;
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  function mountHook(eventId = 1) {
    const { wrapper, queryClient } = createWrapper();
    const hook = renderHook(() => useEventLotterySelection(eventId), {
      wrapper,
    });
    activeClient = queryClient;
    activeUnmount = hook.unmount;
    return hook;
  }

  it('while loading: lotteryId null, rawLotteryId parses param', async () => {
    mockSearchParams = { lottery: '3' };
    let resolveLotteries: (v: unknown) => void = () => {};
    mockGetLotteries.mockReturnValue(
      new Promise(resolve => {
        resolveLotteries = resolve;
      })
    );
    const { result } = mountHook();
    expect(result.current.lotteriesLoaded).toBe(false);
    expect(result.current.lotteryId).toBeNull();
    expect(result.current.rawLotteryId).toBe(3);
    resolveLotteries({
      data: [{ id_lottery: 3, name: 'Alpha', display_order: 0 }],
    });
    await waitFor(() => expect(result.current.lotteriesLoaded).toBe(true));
  });

  it('after load with valid id: lotteryId equals that id', async () => {
    mockSearchParams = { lottery: '3' };
    const { result } = mountHook();
    await waitFor(() => expect(result.current.lotteriesLoaded).toBe(true));
    expect(result.current.lotteryId).toBe(3);
    expect(result.current.rawLotteryId).toBe(3);
  });

  it('after load with id not in list: lotteryId null, raw still set', async () => {
    mockSearchParams = { lottery: '99' };
    const { result } = mountHook();
    await waitFor(() => expect(result.current.lotteriesLoaded).toBe(true));
    expect(result.current.lotteryId).toBeNull();
    expect(result.current.rawLotteryId).toBe(99);
  });

  it('after load with empty list: lotteryId null', async () => {
    mockGetLotteries.mockResolvedValue({ data: [] });
    mockSearchParams = { lottery: '3' };
    const { result } = mountHook();
    await waitFor(() => expect(result.current.lotteriesLoaded).toBe(true));
    expect(result.current.lotteries).toEqual([]);
    expect(result.current.lotteryId).toBeNull();
    expect(result.current.rawLotteryId).toBe(3);
  });

  it('reads lottery from local when global is empty', async () => {
    mockSearchParams = { lottery: '3' };
    mockGlobalParams = {};
    const { result } = mountHook();
    await waitFor(() => expect(result.current.lotteriesLoaded).toBe(true));
    expect(result.current.lotteryId).toBe(3);
    expect(result.current.rawLotteryId).toBe(3);
  });

  it('falls back to global lottery when local has none (chrome)', async () => {
    mockSearchParams = {};
    mockGlobalParams = { lottery: '3' };
    const { result } = mountHook();
    await waitFor(() => expect(result.current.lotteriesLoaded).toBe(true));
    expect(result.current.lotteryId).toBe(3);
    expect(result.current.rawLotteryId).toBe(3);
  });

  it('prefers local over disagreeing global lottery param', async () => {
    mockSearchParams = { lottery: '3' };
    mockGlobalParams = { lottery: '9' };
    const { result } = mountHook();
    await waitFor(() => expect(result.current.lotteriesLoaded).toBe(true));
    expect(result.current.lotteryId).toBe(3);
    expect(result.current.rawLotteryId).toBe(3);
  });
});
