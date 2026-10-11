import {
  formatAnnounceCountdown,
  formatLastRefreshRelative,
  formatLotteryTimestamp,
  formatUnixDateTime24h,
  luckyActivityTs,
  luckyLifecycleRows,
  maxLuckyGroupActivity,
  phoneNumbersFromLucky,
  primaryLuckyLifecycle,
  rulesHaveUnresolvedLucky,
} from '@/components/events/eventLotteryUtils';
import LotteryLuckiesMode from '@/components/events/lottery/LotteryLuckiesMode';
import LotteryEmptyState from '@/components/events/lottery/lotteryShared';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/services/api/baseApi';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockGetLotteryPrizes = jest.fn();
const mockAccept = jest.fn();
const mockReject = jest.fn();
const mockGeneratePdfAvatar = jest.fn();
let mockSearchParams: Record<string, string | undefined> = { lottery: '3' };

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    usePathname: () => '/events/1/lottery/luckies',
    useLocalSearchParams: () => mockSearchParams,
    useGlobalSearchParams: () => mockSearchParams,
  })
);

jest.mock('@/services/api/eventLotteryPrizesApi', () => ({
  EventLotteryPrizesApiService: jest.fn().mockImplementation(() => ({
    getLotteryPrizes: (...args: unknown[]) => mockGetLotteryPrizes(...args),
  })),
}));

jest.mock('@/services/api/lotteryLiveApi', () => ({
  lotteryLiveApi: {
    accept: (...args: unknown[]) => mockAccept(...args),
    reject: (...args: unknown[]) => mockReject(...args),
    prizesBoard: jest.fn(),
  },
}));

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    generatePdfAvatar: (...args: unknown[]) => mockGeneratePdfAvatar(...args),
  })),
}));

function renderWithClient(
  ui: React.ReactElement,
  client = createTestQueryClient()
) {
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

function prizeLinesWithLuckiesFixture(extraLuckies: any[] = []) {
  return {
    data: [
      {
        id_lottery_prize: 20,
        lottery_id: 3,
        prize_id: 1,
        prize_quantity: 2,
        prize: { name: 'Towel' },
        sponsor: null,
        rule_prize_quantity_total: 2,
        activity_at: 9000,
        luckies: [
          {
            id_lucky: 50,
            lottery_rule_id: 7,
            drawn_participation_id: 9,
            short_name: 'A. Wonder',
            pdf_avatar_url: 'https://example.com/a.png',
            drawn_at: 1000,
            available_at: 1100,
            announced_at: null,
            accepted_at: 1200,
            rejected_at: null,
            inserted_at: 100,
            updated_at: 100,
            lottery_rule: {
              id_lottery_rule: 7,
              event_division_id: 2,
              event_division: { division_title: 'Learners' },
            },
            drawn_participation: {
              id_participation: 9,
              player_user_id: 101,
              is_collecting_points: true,
              player: {
                id_user: 101,
                name: 'Alice Wonder',
                phones: [{ phone: '+40111' }, { phone: '+40222' }],
              },
              event_division_id: 9,
            },
          },
          {
            id_lucky: 51,
            lottery_rule_id: 7,
            drawn_participation_id: 10,
            short_name: 'B. Builder',
            pdf_avatar_url: null,
            drawn_at: 9000,
            available_at: 9100,
            announced_at: null,
            accepted_at: null,
            rejected_at: null,
            inserted_at: 200,
            updated_at: 200,
            lottery_rule: {
              id_lottery_rule: 7,
              event_division_id: 2,
              event_division: { division_title: 'Learners' },
            },
            drawn_participation: {
              id_participation: 10,
              player_user_id: 102,
              is_collecting_points: false,
              player: {
                id_user: 102,
                name: 'Bob Builder',
                phones: [{ phone: '+40999' }],
              },
              event_division_id: 9,
            },
          },
          ...extraLuckies,
        ],
      },
      {
        id_lottery_prize: 21,
        lottery_id: 3,
        prize: { name: 'Ball' },
        sponsor: { name: 'Nike' },
        rule_prize_quantity_total: 1,
        luckies: [],
      },
    ],
    meta: { has_unresolved_pending: true },
  };
}

describe('eventLotteryUtils', () => {
  it('formats unix timestamps without seconds', () => {
    const s = formatUnixDateTime24h(1_700_000_000);
    expect(s).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  it('primaryLuckyLifecycle prefers rejected then accepted', () => {
    expect(
      primaryLuckyLifecycle({ rejected_at: 1, accepted_at: 2 })?.key
    ).toBe('rejected');
    expect(primaryLuckyLifecycle({ accepted_at: 2 })?.key).toBe('accepted');
  });

  it('luckyLifecycleRows and phone helpers', () => {
    expect(luckyLifecycleRows({ accepted_at: 1 }).length).toBe(5);
    expect(
      phoneNumbersFromLucky({
        drawn_participation: { player: { phones: [{ phone: '+1' }] } },
      })
    ).toEqual(['+1']);
    expect(rulesHaveUnresolvedLucky([{ luckies: [{ accepted_at: null }] }])).toBe(
      true
    );
    expect(luckyActivityTs({ drawn_at: 5, accepted_at: 9 })).toBe(9);
    expect(maxLuckyGroupActivity([{ drawn_at: 1 }, { accepted_at: 4 }])).toBe(4);
    expect(formatAnnounceCountdown(Math.floor(Date.now() / 1000) + 65)).toMatch(
      /^\d{2}:\d{2}$/
    );
    expect(formatLastRefreshRelative(Date.now() - 1000)).toMatch(/second/);
    expect(formatLotteryTimestamp(null)).toBe('—');
  });
});

describe('LotteryLuckiesMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    (window as any).confirm = jest.fn(() => true);
    mockSearchParams = { lottery: '3' };
    mockGetLotteryPrizes.mockResolvedValue(prizeLinesWithLuckiesFixture());
    mockAccept.mockResolvedValue({});
    mockReject.mockResolvedValue({});
    mockGeneratePdfAvatar.mockResolvedValue({
      data: { pdf_avatar_url: 'https://cdn.example/pdf.png' },
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it('fetches luckies board without event_division_id', async () => {
    const { findByTestId } = renderWithClient(
      <LotteryLuckiesMode lotteryId={3} />
    );
    await findByTestId('lottery-luckies-board');
    const args = mockGetLotteryPrizes.mock.calls[0][0];
    expect(args.include).toBe('luckies');
    expect(args.event_division_id).toBeUndefined();
    expect(args.filters).toEqual({ lottery_id: 3 });
  });

  it('uses division title from board payload', async () => {
    const { findByTestId } = renderWithClient(
      <LotteryLuckiesMode lotteryId={3} />
    );
    expect(await findByTestId('lucky-header-50')).toHaveTextContent(
      'Lucky #50 · Learners'
    );
  });

  it('shows empty state when no lottery selected', () => {
    const { getByTestId } = render(<LotteryEmptyState />);
    expect(getByTestId('lottery-select-empty')).toBeTruthy();
  });

  it('accept and reject invalidate lottery-scoped query key', async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryLuckiesMode lotteryId={3} />,
      client
    );
    await findByTestId('lottery-lucky-card-51');
    fireEvent.press(getByTestId('lottery-accept-lucky-51'));
    await waitFor(() => expect(mockAccept).toHaveBeenCalledWith(3, 51));
    fireEvent.press(getByTestId('lottery-reject-lucky-51'));
    await waitFor(() => expect(mockReject).toHaveBeenCalled());
    const expectedKey = queryKeys.eventLotteryPrizesWithLuckies(3);
    expect(
      spy.mock.calls.some(
        (c: any[]) =>
          JSON.stringify(c[0]?.queryKey) === JSON.stringify(expectedKey)
      )
    ).toBe(true);
  });

  it('hides accept/reject when finalized', async () => {
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryLuckiesMode lotteryId={3} eventFinalized />
    );
    await findByTestId('lottery-finalized-hint');
    expect(
      getByTestId('lottery-accept-lucky-51').props.accessibilityState?.disabled
    ).toBe(true);
  });

  it('keeps reload enabled after a missing-profile failure', async () => {
    mockGeneratePdfAvatar.mockRejectedValue(
      new ApiError(422, 'Profile image missing')
    );
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryLuckiesMode lotteryId={3} />
    );
    await findByTestId('lucky-avatar-51-reload');
    fireEvent.press(getByTestId('lucky-avatar-51-reload'));
    await waitFor(() => expect(mockGeneratePdfAvatar).toHaveBeenCalled());
    expect(
      getByTestId('lucky-avatar-51-reload').props.accessibilityState?.disabled
    ).toBe(false);
  });

  it('polls while unresolved pending and shows last refresh', async () => {
    jest.useFakeTimers();
    const { findByTestId, unmount } = renderWithClient(
      <LotteryLuckiesMode lotteryId={3} />
    );
    await findByTestId('lottery-luckies-last-refresh');
    const callsBefore = mockGetLotteryPrizes.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    await waitFor(() =>
      expect(mockGetLotteryPrizes.mock.calls.length).toBeGreaterThan(callsBefore)
    );
    unmount();
    jest.useRealTimers();
  });

  it('does not poll when has_unresolved_pending is false', async () => {
    jest.useFakeTimers();
    mockGetLotteryPrizes.mockResolvedValue({
      ...prizeLinesWithLuckiesFixture(),
      meta: { current_page: 1, has_unresolved_pending: false },
    });
    const { findByTestId, queryByTestId, unmount } = renderWithClient(
      <LotteryLuckiesMode lotteryId={3} />
    );
    await findByTestId('lottery-luckies-board');
    expect(queryByTestId('lottery-luckies-last-refresh')).toBeNull();
    const callsBefore = mockGetLotteryPrizes.mock.calls.length;
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(mockGetLotteryPrizes.mock.calls.length).toBe(callsBefore);
    unmount();
    jest.useRealTimers();
  });
});
