import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditionLotteryTab from '@/components/editions/EditionLotteryTab';

const mockPush = jest.fn();
const mockOpen = jest.fn();
const mockGetLotteries = jest.fn(async () => ({
  data: [{ id_lottery: 3, orderliness: 1 }],
}));
const mockPrizesBoard = jest.fn(async () => ({
  data: {
    logo: '/media/lottery/minitour-long-e.png',
    background: '/media/lottery/padel-balls.jpg',
    intervals: [
      {
        label: '10:00 – 12:00',
        prizes: [
          { prize: { name: 'Racket' }, interval_quantity: 2, luckies: [] },
        ],
      },
    ],
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/services/api/editionLotteriesApi', () => ({
  EditionLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: (...args: unknown[]) => mockGetLotteries(...args),
    deleteLottery: jest.fn(),
  })),
}));

jest.mock('@/services/api/lotteryLiveApi', () => ({
  lotteryLiveApi: {
    prizesBoard: (...args: unknown[]) => mockPrizesBoard(...args),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe('EditionLotteryTab prizes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('shows prizes board and opens CRUD links in a new window', async () => {
    const { findByText, findByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="prizes" />
    );
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    await waitFor(() => expect(mockPrizesBoard).toHaveBeenCalledWith(3));
    expect(await findByText(/Racket/)).toBeTruthy();
    fireEvent.press(await findByTestId('lottery-link-lotteries'));
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost/edition-lotteries',
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
