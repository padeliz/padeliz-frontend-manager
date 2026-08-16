import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LotteryLiveKiosk from '@/components/lottery/LotteryLiveKiosk';

const mockLive = jest.fn();
const mockAnnounce = jest.fn(async () => ({
  data: {
    status: 'pending',
    logo: 'https://example.com/logo.png',
    background: 'https://example.com/bg.jpg',
    edition: { name: 'Test Edition' },
    lucky: {
      id_lucky: 5,
      seconds_left: 0,
      announced_at: 999,
      prize_index: 1,
      prize_quantity: 2,
      player: { name: 'Winner', avatar_url: null },
      division: { division_title: 'Beginners', color: '#0a0', court: 'C1' },
      prize: {
        name: 'Racket',
        template: 'IMAGE_MIDDLE',
        box_1_text: 'Prize',
        box_1_bg_color: '#111',
        box_1_text_color: '#fff',
        media_url: 'https://example.com/p.png',
        is_video: false,
      },
    },
    accepted: [],
  },
}));
const mockGetEdition = jest.fn(async () => ({
  data: { id_edition: 1, name: 'Test Edition', finalized_at: null },
}));

jest.mock('@/services/api/editionsApi', () => ({
  EditionsApiService: jest.fn().mockImplementation(() => ({
    getEdition: (...args: unknown[]) => mockGetEdition(...args),
  })),
}));

jest.mock('@/services/api/editionLotteriesApi', () => ({
  EditionLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: jest.fn(async () => ({
      data: [{ id_lottery: 3 }],
    })),
  })),
}));

jest.mock('@/services/api/lotteryLiveApi', () => ({
  lotteryLiveApi: {
    live: (...args: unknown[]) => mockLive(...args),
    announce: (...args: unknown[]) => mockAnnounce(...args),
    accept: jest.fn(),
    reject: jest.fn(),
  },
}));

function renderKiosk() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LotteryLiveKiosk editionId={1} />
    </QueryClientProvider>
  );
}

const prizeLucky = {
  id_lucky: 5,
  seconds_left: 0,
  announced_at: null as number | null,
  prize_index: 1,
  prize_quantity: 2,
  player: { name: 'Winner', avatar_url: null },
  division: { division_title: 'Beginners', color: '#0a0', court: 'C1' },
  prize: {
    box_1_text: 'Prize',
    box_1_bg_color: '#111',
    box_1_text_color: '#fff',
    template: 'IMAGE_MIDDLE',
    media_url: 'https://example.com/p.png',
    is_video: false,
  },
};

describe('LotteryLiveKiosk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetEdition.mockResolvedValue({
      data: { id_edition: 1, name: 'Test Edition', finalized_at: null },
    });
    mockLive.mockResolvedValue({
      data: {
        status: 'pending',
        logo: 'https://example.com/logo.png',
        background: 'https://example.com/bg.jpg',
        edition: { name: 'Test Edition' },
        lucky: { ...prizeLucky },
        accepted: [],
      },
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('countdown phase shows prize beside timer without decide buttons', async () => {
    mockLive.mockResolvedValue({
      data: {
        status: 'pending',
        logo: 'https://example.com/logo.png',
        background: 'https://example.com/bg.jpg',
        edition: { name: 'Test Edition' },
        lucky: { ...prizeLucky, seconds_left: 65, announced_at: null },
        accepted: [],
      },
    });
    const { findByTestId, findByText, queryByText } = renderKiosk();
    expect(await findByTestId('lottery-live-header')).toBeTruthy();
    expect(await findByTestId('lottery-live-in-progress')).toBeTruthy();
    expect(await findByTestId('lottery-live-timer')).toHaveTextContent(
      /01:0[45]/
    );
    expect(await findByText('Prize')).toBeTruthy();
    expect(queryByText(/draw someone else/)).toBeNull();
    expect(queryByText(/great, I'll keep it/)).toBeNull();
  });

  it('auto-announces and reveals player without decide buttons', async () => {
    const { findByText, findByTestId, queryByTestId, queryByText } =
      renderKiosk();
    await waitFor(() => expect(mockAnnounce).toHaveBeenCalledWith(3, 5), {
      timeout: 5000,
    });
    expect(await findByText(/Winner/)).toBeTruthy();
    expect(await findByText('Prize')).toBeTruthy();
    expect(await findByTestId('lottery-live-in-progress')).toBeTruthy();
    expect(queryByTestId('lottery-live-timer')).toBeNull();
    expect(queryByText(/great, I'll keep it/)).toBeNull();
    expect(queryByText(/draw someone else/)).toBeNull();
    expect(queryByTestId('lottery-live-close')).toBeNull();
    expect(queryByText('Close')).toBeNull();
  });

  it('shows finalized read-only line without decide buttons', async () => {
    mockGetEdition.mockResolvedValue({
      data: {
        id_edition: 1,
        name: 'Test Edition',
        finalized_at: 123,
      },
    });
    mockLive.mockResolvedValue({
      data: {
        status: 'pending',
        logo: 'https://example.com/logo.png',
        background: 'https://example.com/bg.jpg',
        edition: { name: 'Test Edition' },
        lucky: { ...prizeLucky, seconds_left: 0, announced_at: 999 },
        accepted: [],
      },
    });
    const { findByText, queryByText } = renderKiosk();
    expect(await findByText(/Edition finalized — view only/)).toBeTruthy();
    expect(queryByText(/draw someone else/)).toBeNull();
    expect(queryByText(/great, I'll keep it/)).toBeNull();
  });

  it('centers edition title without flex-end offset', async () => {
    mockLive.mockResolvedValue({
      data: {
        status: 'pending',
        logo: 'https://example.com/logo.png',
        background: 'https://example.com/bg.jpg',
        edition: { name: 'Test Edition' },
        lucky: { ...prizeLucky, seconds_left: 10 },
        accepted: [],
      },
    });
    const { findByTestId } = renderKiosk();
    await findByTestId('lottery-live-timer');
    const title = await findByTestId('lottery-live-edition-title');
    expect(title).toHaveTextContent(/Test Edition Lottery/);
    const style = title.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.alignSelf).not.toBe('flex-end');
    expect(flat.marginRight).not.toBe('20%');
  });

  it('stops polling live when lottery is finished', async () => {
    mockLive.mockResolvedValue({
      data: {
        status: 'finished',
        logo: 'https://example.com/logo.png',
        background: 'https://example.com/bg.jpg',
        edition: { name: 'Test Edition' },
        lucky: null,
        accepted: [
          {
            id_lucky: 1,
            player: { name: 'A' },
            division: { division_title: 'X', color: '#111' },
          },
        ],
        next_edition: { name: 'Next', date: '2026-09-01' },
      },
    });
    const { findByText } = renderKiosk();
    expect(await findByText(/Congratulations/)).toBeTruthy();
    const callsAfterLoad = mockLive.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockLive.mock.calls.length).toBe(callsAfterLoad);
  });

  it('renders still prize media with expected uri', async () => {
    const mediaUrl = 'https://example.com/liliac.png';
    mockLive.mockResolvedValue({
      data: {
        status: 'pending',
        logo: 'https://example.com/logo.png',
        background: 'https://example.com/bg.jpg',
        edition: { name: 'Test Edition' },
        lucky: {
          ...prizeLucky,
          seconds_left: 30,
          announced_at: null,
          prize: {
            ...prizeLucky.prize,
            media_url: mediaUrl,
            is_video: false,
            box_1_text: 'Liliac Wine',
          },
        },
        accepted: [],
      },
    });
    const { findByText, findByTestId } = renderKiosk();
    expect(await findByText('Liliac Wine')).toBeTruthy();
    const media = await findByTestId('lottery-live-prize-media');
    const src = media.props.src ?? media.props.source?.uri;
    expect(src).toBe(mediaUrl);
  });

  it('renders video prize media element', async () => {
    const mediaUrl = 'https://example.com/sticker.mp4';
    mockLive.mockResolvedValue({
      data: {
        status: 'pending',
        logo: 'https://example.com/logo.png',
        background: 'https://example.com/bg.jpg',
        edition: { name: 'Test Edition' },
        lucky: {
          ...prizeLucky,
          seconds_left: 30,
          announced_at: null,
          prize: {
            ...prizeLucky.prize,
            media_url: mediaUrl,
            is_video: true,
            box_1_text: 'MiniTour Sticker',
          },
        },
        accepted: [],
      },
    });
    const { findByText, findByTestId } = renderKiosk();
    expect(await findByText('MiniTour Sticker')).toBeTruthy();
    expect(await findByTestId('lottery-live-prize-media')).toBeTruthy();
  });
});
