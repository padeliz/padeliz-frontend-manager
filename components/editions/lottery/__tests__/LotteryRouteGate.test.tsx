import LotteryRouteGate from '@/components/editions/lottery/LotteryRouteGate';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Text } from 'react-native';
import { cleanup, render, waitFor } from '@testing-library/react-native';

const mockGetLotteries = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};

jest.mock('@/services/api/editionLotteriesApi', () => ({
  EditionLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: (...args: unknown[]) => mockGetLotteries(...args),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useLocalSearchParams: () => mockSearchParams,
    useGlobalSearchParams: () => mockSearchParams,
  })
);

function renderGate() {
  const client = createTestQueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={client}>
      <LotteryRouteGate editionId={1}>
        {lotteryId => (
          <Text testID="lottery-mode-mounted">{String(lotteryId)}</Text>
        )}
      </LotteryRouteGate>
    </QueryClientProvider>
  );
  return { client, ...utils };
}

describe('LotteryRouteGate', () => {
  afterEach(async () => {
    cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
  });

  it('while loading does not show empty states or mode', async () => {
    let resolveLotteries: (v: unknown) => void = () => {};
    mockGetLotteries.mockReturnValue(
      new Promise(resolve => {
        resolveLotteries = resolve;
      })
    );
    const { queryByTestId, getByTestId, client } = renderGate();
    expect(getByTestId('lottery-route-loading')).toBeTruthy();
    expect(queryByTestId('lottery-none-empty')).toBeNull();
    expect(queryByTestId('lottery-select-empty')).toBeNull();
    expect(queryByTestId('lottery-mode-mounted')).toBeNull();
    resolveLotteries({ data: [] });
    await waitFor(() => expect(queryByTestId('lottery-route-loading')).toBeNull());
    await disposeTestQueryClient(client);
  });

  it('zero lotteries shows none empty state', async () => {
    mockGetLotteries.mockResolvedValue({ data: [] });
    const { findByTestId, queryByTestId, client } = renderGate();
    expect(await findByTestId('lottery-none-empty')).toHaveTextContent(
      'No lotteries for this edition.'
    );
    expect(queryByTestId('lottery-mode-mounted')).toBeNull();
    await disposeTestQueryClient(client);
  });

  it('lotteries exist but none selected shows select empty', async () => {
    mockGetLotteries.mockResolvedValue({
      data: [
        { id_lottery: 3, name: 'A', display_order: 0 },
        { id_lottery: 9, name: 'B', display_order: 1 },
      ],
    });
    const { findByTestId, queryByTestId, client } = renderGate();
    expect(await findByTestId('lottery-select-empty')).toHaveTextContent(
      'Select a lottery to view prizes, rules, and luckies.'
    );
    expect(queryByTestId('lottery-mode-mounted')).toBeNull();
    await disposeTestQueryClient(client);
  });

  it('valid lotteryId mounts children', async () => {
    mockSearchParams = { lottery: '3' };
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, name: 'A', display_order: 0 }],
    });
    const { findByTestId, client } = renderGate();
    expect(await findByTestId('lottery-mode-mounted')).toHaveTextContent('3');
    await disposeTestQueryClient(client);
  });

  it('single lottery mounts children without ?lottery=', async () => {
    mockSearchParams = {};
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, name: 'A', display_order: 0 }],
    });
    const { findByTestId, queryByTestId, client } = renderGate();
    expect(await findByTestId('lottery-mode-mounted')).toHaveTextContent('3');
    expect(queryByTestId('lottery-select-empty')).toBeNull();
    await disposeTestQueryClient(client);
  });

  it('single lottery mounts even when URL has foreign lottery id', async () => {
    mockSearchParams = { lottery: '99' };
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, name: 'A', display_order: 0 }],
    });
    const { findByTestId, queryByTestId, client } = renderGate();
    expect(await findByTestId('lottery-mode-mounted')).toHaveTextContent('3');
    expect(queryByTestId('lottery-select-empty')).toBeNull();
    await disposeTestQueryClient(client);
  });

  it('multi list with foreign lotteryId does not mount mode', async () => {
    mockSearchParams = { lottery: '99' };
    mockGetLotteries.mockResolvedValue({
      data: [
        { id_lottery: 3, name: 'A', display_order: 0 },
        { id_lottery: 9, name: 'B', display_order: 1 },
      ],
    });
    const { findByTestId, queryByTestId, client } = renderGate();
    expect(await findByTestId('lottery-select-empty')).toBeTruthy();
    expect(queryByTestId('lottery-mode-mounted')).toBeNull();
    await disposeTestQueryClient(client);
  });
});

