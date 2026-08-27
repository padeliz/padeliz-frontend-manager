import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import EditionLotteryTab from '@/components/editions/EditionLotteryTab';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockOpen = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};
const mockGetLotteries = jest.fn(async () => ({
  data: [
    { id_lottery: 9, name: 'Zebra Draw', display_order: 2 },
    { id_lottery: 3, name: 'Alpha Draw', display_order: 0 },
  ],
}));
const mockGetLotteryPrizes = jest.fn(async () => ({
  data: [
    {
      id_lottery_prize: 11,
      lottery_id: 3,
      prize_id: 1,
      prize_quantity: 2,
      prize: { name: 'Racket' },
      sponsor: { name: 'Acme' },
    },
  ],
}));
const mockPrizesBoard = jest.fn(async () => ({
  data: {
    logo: '/media/lottery/minitour-long-e.png',
    background: '/media/lottery/padel-balls.jpg',
    intervals: [
      {
        label: '10:00 – 12:00',
        prizes: [
          {
            prize: { name: 'Racket', sponsor: { name: 'Acme' } },
            interval_quantity: 2,
            luckies: [],
          },
        ],
      },
    ],
  },
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/editions/1/lottery/prizes',
  useLocalSearchParams: () => mockSearchParams,
  useGlobalSearchParams: () => mockSearchParams,
})
);

jest.mock('@/services/api/editionLotteriesApi', () => ({
  EditionLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: (...args: unknown[]) => mockGetLotteries(...args),
    deleteLottery: jest.fn(),
  })),
}));

jest.mock('@/services/api/editionLotteryPrizesApi', () => ({
  EditionLotteryPrizesApiService: jest.fn().mockImplementation(() => ({
    getLotteryPrizes: (...args: unknown[]) => mockGetLotteryPrizes(...args),
  })),
}));

jest.mock('@/services/api/lotteryLiveApi', () => ({
  lotteryLiveApi: {
    prizesBoard: (...args: unknown[]) => mockPrizesBoard(...args),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe('EditionLotteryTab prizes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    (global as any).window = {
      ...(global as any).window,
      open: mockOpen,
      location: { origin: 'http://localhost' },
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('does not auto-pick lotteries[0] or fetch prizes-board without ?lottery=', async () => {
    const { findByTestId, queryByText } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="prizes" />
    );
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(await findByTestId('lottery-select-empty')).toBeTruthy();
    expect(mockPrizesBoard).not.toHaveBeenCalled();
    expect(mockGetLotteryPrizes).not.toHaveBeenCalled();
    expect(queryByText(/Lottery #3/)).toBeNull();
  });

  it('labels picker with lottery name ordered by display_order', async () => {
    const { findByText, getByText } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="prizes" />
    );
    fireEvent.press(await findByText('Select lottery'));
    expect(getByText('Alpha Draw')).toBeTruthy();
    expect(getByText('Zebra Draw')).toBeTruthy();
    expect(getByText('Alpha Draw')).toBeTruthy();
  });

  it('shows prize lines and board for selected lottery with prize · sponsor labels', async () => {
    mockSearchParams = { lottery: '3' };
    const { findByText, findByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="prizes" />
    );
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    await waitFor(() => expect(mockPrizesBoard).toHaveBeenCalledWith(3));
    expect(await findByTestId('lottery-prize-line-11')).toHaveTextContent(
      /Racket · Acme/
    );
    fireEvent.press(await findByTestId('lottery-link-lotteries'));
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost/edition-lotteries',
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('updates ?lottery= when picker changes', async () => {
    const { findByText, getByText } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="prizes" />
    );
    fireEvent.press(await findByText('Select lottery'));
    fireEvent.press(getByText('Alpha Draw'));
    expect(mockReplace).toHaveBeenCalledWith(
      '/editions/1/lottery/prizes?lottery=3'
    );
  });
});
