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
} from '@/components/editions/editionLotteryUtils';
import EditionLotteryTab from '@/components/editions/EditionLotteryTab';
import { queryKeys } from '@/lib/queryClient';
import { ApiError } from '@/services/api/baseApi';
import { formatFinalizedAt } from '@/utils/softDirtyNav';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockGetRules = jest.fn();
const mockGetLotteryPrizes = jest.fn();
const mockAccept = jest.fn();
const mockReject = jest.fn();
const mockGetLotteries = jest.fn(async () => ({
  data: [{ id_lottery: 3, name: 'Alpha Draw', display_order: 1 }],
}));
const mockGeneratePdfAvatar = jest.fn();
let mockSearchParams: Record<string, string | undefined> = { lottery: '3' };

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/editions/1/lottery/luckies',
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

jest.mock('@/services/api/editionLotteryRulesApi', () => ({
  EditionLotteryRulesApiService: jest.fn().mockImplementation(() => ({
    getRules: (...args: unknown[]) => mockGetRules(...args),
    deleteRule: jest.fn(),
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

function pendingUnannouncedLucky(overrides: Record<string, unknown> = {}) {
  return {
    id_lucky: 60,
    lottery_rule_id: 7,
    drawn_participation_id: 11,
    short_name: 'C. Pending',
    pdf_avatar_url: null,
    drawn_at: 100,
    available_at: Math.floor(Date.now() / 1000) + 125,
    announced_at: null,
    accepted_at: null,
    rejected_at: null,
    inserted_at: 100,
    updated_at: 100,
    lottery_rule: {
      id_lottery_rule: 7,
      edition_division_id: 2,
    },
    drawn_participation: {
      id_participation: 11,
      player_id: 103,
      is_collecting_points: false,
      player: {
        id_player: 103,
        name: 'Chris Pending',
        phones: [{ phone: '+40888' }],
      },
      edition_division_id: 9,
    },
    ...overrides,
  };
}

function nestedRulesFixture() {
  return {
    data: [
      {
        id_lottery_rule: 8,
        lottery_id: 3,
        edition_division_id: 2,
        rule_prize_quantity: 1,
        orderliness: 0,
        lottery: { id_lottery: 3, prize: { name: 'Mug' } },
        lottery_prize: {
          lottery_id: 3,
          prize: { name: 'Mug' },
          sponsor_id: null,
        },
      },
      {
        id_lottery_rule: 7,
        lottery_id: 3,
        edition_division_id: 2,
        rule_prize_quantity: 2,
        orderliness: 1,
        lottery: { id_lottery: 3, prize: { name: 'Towel' } },
        lottery_prize: {
          lottery_id: 3,
          prize: { name: 'Towel' },
          sponsor_id: null,
        },
      },
    ],
  };
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
              edition_division_id: 2,
            },
            drawn_participation: {
              id_participation: 9,
              player_id: 101,
              is_collecting_points: true,
              player: {
                id_player: 101,
                name: 'Alice Wonder',
                phones: [{ phone: '+40111' }, { phone: '+40222' }],
              },
              edition_division_id: 9,
            },
          },
          {
            id_lucky: 51,
            lottery_rule_id: 7,
            drawn_participation_id: 10,
            short_name: 'B. Builder',
            pdf_avatar_url: null,
            drawn_at: 9000,
            available_at: 1000,
            announced_at: 2000,
            accepted_at: null,
            rejected_at: null,
            inserted_at: 200,
            updated_at: 9000,
            lottery_rule: {
              id_lottery_rule: 7,
              edition_division_id: 2,
            },
            drawn_participation: {
              id_participation: 10,
              player_id: 102,
              is_collecting_points: false,
              player: {
                id_player: 102,
                name: 'Bob Builder',
                phones: [{ phone: '+40999' }],
              },
              edition_division_id: 9,
            },
          },
          ...extraLuckies,
        ],
      },
      {
        id_lottery_prize: 21,
        lottery_id: 3,
        prize_id: 2,
        prize_quantity: 1,
        prize: { name: 'Mug' },
        sponsor: null,
        rule_prize_quantity_total: 1,
        activity_at: null,
        luckies: [],
      },
    ],
    meta: { current_page: 1, has_unresolved_pending: true },
  };
}

function renderWithClient(
  ui: React.ReactElement,
  client?: ReturnType<typeof createTestQueryClient>
) {
  const c =
    client ??
    createTestQueryClient();
  return {
    client: c,
    ...render(<QueryClientProvider client={c}>{ui}</QueryClientProvider>),
  };
}

describe('lucky utils', () => {
  it('prefers rejected over accepted over drawn', () => {
    const primary = primaryLuckyLifecycle({
      rejected_at: 100,
      accepted_at: 90,
      drawn_at: 50,
    });
    expect(primary?.key).toBe('rejected');
  });

  it('lists all five with em dash for missing', () => {
    const rows = luckyLifecycleRows({ drawn_at: 50 });
    expect(rows).toHaveLength(5);
    expect(rows.find(r => r.key === 'rejected')?.display).toBe('—');
  });

  it('computes activity and relative refresh', () => {
    expect(luckyActivityTs({ drawn_at: 10, accepted_at: 50 })).toBe(50);
    expect(
      maxLuckyGroupActivity([{ inserted_at: 1 }, { updated_at: 9 }])
    ).toBe(9);
    expect(formatLastRefreshRelative(Date.now() - 4000, Date.now())).toMatch(
      /4 seconds ago/
    );
    expect(
      rulesHaveUnresolvedLucky([
        { luckies: [{ accepted_at: null, rejected_at: null }] },
      ])
    ).toBe(true);
    expect(
      phoneNumbersFromLucky({
        drawn_participation: {
          player: { phones: [{ phone: '1' }, { phone: '2' }] },
        },
      })
    ).toEqual(['1', '2']);
  });

  it('formatAnnounceCountdown handles missing, seconds, ms, and due', () => {
    expect(formatAnnounceCountdown(null)).toBeNull();
    expect(formatAnnounceCountdown('')).toBeNull();
    expect(formatAnnounceCountdown(NaN)).toBeNull();
    const now = 1_700_000_000_000;
    expect(formatAnnounceCountdown(Math.floor(now / 1000) + 125, now)).toBe(
      '02:05'
    );
    expect(formatAnnounceCountdown(now + 125_000, now)).toBe('02:05');
    expect(formatAnnounceCountdown(Math.floor(now / 1000) - 10, now)).toBe(
      '00:00'
    );
    expect(formatAnnounceCountdown(Math.floor(now / 1000), now)).toBe('00:00');
  });

  it('formatUnixDateTime24h and formatFinalizedAt use 24h without AM/PM', () => {
    expect(formatUnixDateTime24h(null)).toBe('—');
    expect(formatUnixDateTime24h('')).toBe('—');
    expect(formatUnixDateTime24h('bogus')).toBe('bogus');
    expect(formatUnixDateTime24h(0)).toBe('0');
    // 2024-01-15 14:30:45 UTC
    const sec = 1_705_327_845;
    const fromSec = formatUnixDateTime24h(sec);
    const fromMs = formatUnixDateTime24h(sec * 1000);
    const finalized = formatFinalizedAt(sec);
    for (const s of [fromSec, fromMs, finalized, formatLotteryTimestamp(sec)]) {
      expect(s).not.toMatch(/\bAM\b/i);
      expect(s).not.toMatch(/\bPM\b/i);
      // hour:minute only — no seconds segment in the time portion
      expect(s).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
    }
  });
});

describe('EditionLotteryTab rules/luckies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    (window as any).confirm = jest.fn(() => true);
    mockSearchParams = { lottery: '3' };
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, name: 'Alpha Draw', display_order: 1 }],
    });
    mockGetRules.mockResolvedValue(nestedRulesFixture());
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

  it('rules Edit and Delete are right-aligned siblings', async () => {
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab
        editionId={1}
        editionDivisionId={2}
        mode="rules"
        divisions={
          [{ id_edition_division: 2, division_title: 'Learners' }] as any
        }
      />
    );
    const row = await findByTestId('lottery-rule-row-7');
    expect(await findByTestId('lottery-edit-rule-7')).toBeTruthy();
    expect(await findByTestId('lottery-delete-rule-7')).toBeTruthy();
    expect(String(row.props.className)).toContain('flex-row');
  });

  it('luckies board hides manage chrome edit delete and shows phones accept', async () => {
    const { findByTestId, getByTestId, getAllByTestId, queryByTestId } =
      renderWithClient(
        <EditionLotteryTab
          editionId={1}
          mode="luckies"
          divisions={
            [{ id_edition_division: 2, division_title: 'Learners' }] as any
          }
        />
      );
    await findByTestId('lucky-group-header-20');
    expect(queryByTestId('lottery-link-luckies')).toBeNull();
    expect(queryByTestId('lottery-link-add-lucky')).toBeNull();
    expect(queryByTestId('lottery-link-edit-lucky')).toBeNull();
    expect(queryByTestId('lottery-delete-lucky-50')).toBeNull();
    expect(queryByTestId('lottery-delete-lucky-51')).toBeNull();
    expect(queryByTestId('lottery-accept-lucky-50')).toBeNull();
    expect(getByTestId('lottery-accept-lucky-51')).toBeTruthy();
    expect(getByTestId('lottery-reject-lucky-51')).toBeTruthy();
    expect(queryByTestId('lucky-phones-50')).toBeNull();
    expect(getByTestId('lucky-phone-51-0')).toHaveTextContent('+40999');
    expect(getByTestId('lucky-phone-icon-51-0')).toBeTruthy();
    expect(getByTestId('lucky-avatar-50-present')).toBeTruthy();
    expect(getByTestId('lucky-avatar-51-reload')).toBeTruthy();
    expect(queryByTestId('lucky-avatar-51-present')).toBeNull();
    const headers = getAllByTestId(/lucky-group-header-/);
    expect(headers.map(h => h.props.testID)).toEqual([
      'lucky-group-header-20',
      'lucky-group-header-21',
    ]);
  });

  it('shows quantity-only group header when prize name missing', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 20,
          lottery_id: 3,
          prize: {},
          sponsor: null,
          rule_prize_quantity_total: 2,
          luckies: [
            {
              id_lucky: 5,
              lottery_rule_id: 7,
              short_name: 'A. Wonder',
              drawn_at: 1000,
              available_at: 1100,
              accepted_at: 1,
              rejected_at: null,
              lottery_rule: { edition_division_id: 2 },
              drawn_participation: {
                edition_division_id: 9,
                player: { name: 'Alice' },
              },
            },
          ],
        },
      ],
      meta: { has_unresolved_pending: false },
    });
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lucky-group-header-20')).toHaveTextContent('2');
  });

  it('shows empty-tab copy when there are no prize lines', async () => {
    mockGetLotteryPrizes.mockResolvedValue({ data: [], meta: {} });
    const { findByText, queryByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByText(/No lottery prizes for this edition/)).toBeTruthy();
    expect(queryByTestId(/lucky-group-/)).toBeNull();
  });

  it('does not fetch prizes without ?lottery=', async () => {
    mockSearchParams = {};
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lottery-select-empty')).toBeTruthy();
    expect(mockGetLotteryPrizes).not.toHaveBeenCalled();
  });

  it('keeps empty luckies groups when luckies arrays are empty', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 9,
          lottery_id: 3,
          prize: { name: 'Ball' },
          sponsor: null,
          rule_prize_quantity_total: 3,
          luckies: [],
        },
      ],
      meta: { has_unresolved_pending: false },
    });
    const { findByTestId, queryByText } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lucky-group-header-9')).toHaveTextContent(
      'Ball × 3'
    );
    expect(queryByText(/No lottery prizes/)).toBeNull();
  });

  it('invalidates rules-with-luckies on accept and reject', async () => {
    const client = createTestQueryClient();
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionLotteryTab
        editionId={1}
        editionDivisionId={2}
        mode="luckies"
        divisions={
          [{ id_edition_division: 2, division_title: 'Learners' }] as any
        }
      />,
      client
    );
    await findByTestId('lottery-lucky-card-51');
    fireEvent.press(getByTestId('lottery-accept-lucky-51'));
    await waitFor(() => expect(mockAccept).toHaveBeenCalledWith(3, 51));
    fireEvent.press(getByTestId('lottery-reject-lucky-51'));
    await waitFor(() => expect(mockReject).toHaveBeenCalled());
    const expectedKey = queryKeys.editionLotteryPrizesWithLuckies(1, 2, 3);
    expect(
      spy.mock.calls.some(
        (c: any[]) =>
          JSON.stringify(c[0]?.queryKey) === JSON.stringify(expectedKey)
      )
    ).toBe(true);
  });

  it('reloads pdf avatar and keeps reload disabled until request finishes', async () => {
    let resolveAvatar: (v: unknown) => void = () => {};
    mockGeneratePdfAvatar.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveAvatar = resolve;
        })
    );
    const { findByTestId, getByTestId, queryByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    await findByTestId('lucky-avatar-51-reload');
    fireEvent.press(getByTestId('lucky-avatar-51-reload'));
    await waitFor(() => expect(mockGeneratePdfAvatar).toHaveBeenCalled());
    expect(
      getByTestId('lucky-avatar-51-reload').props.accessibilityState?.disabled
    ).toBe(true);

    await act(async () => {
      resolveAvatar({ data: { pdf_avatar_url: 'https://cdn.example/pdf.png' } });
    });
    expect(await findByTestId('lucky-avatar-51-present')).toBeTruthy();
    expect(queryByTestId('lucky-avatar-51-reload')).toBeNull();
  });

  it('keeps reload enabled after a missing-profile failure', async () => {
    mockGeneratePdfAvatar.mockRejectedValue(
      new ApiError(
        422,
        'Player is missing a profile image.',
        undefined,
        'missing_profile_image'
      )
    );
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    await findByTestId('lucky-avatar-51-reload');
    fireEvent.press(getByTestId('lucky-avatar-51-reload'));
    await waitFor(() =>
      expect(getByTestId('lucky-avatar-51-error')).toHaveTextContent(
        /missing a profile image/i
      )
    );
    expect(
      getByTestId('lucky-avatar-51-reload').props.accessibilityState?.disabled
    ).toBe(false);

    mockGeneratePdfAvatar.mockResolvedValue({
      data: { pdf_avatar_url: 'https://cdn.example/retry.png' },
    });
    fireEvent.press(getByTestId('lucky-avatar-51-reload'));
    expect(await findByTestId('lucky-avatar-51-present')).toBeTruthy();
    expect(mockGeneratePdfAvatar).toHaveBeenCalledTimes(2);
  });

  it('shows last refresh while unresolved; hides when finalized', async () => {
    const { findByTestId, queryByTestId, rerender, client } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lottery-luckies-last-refresh')).toBeTruthy();

    rerender(
      <QueryClientProvider client={client}>
        <EditionLotteryTab
          editionId={1}
          mode="luckies"
          editionFinalized
          divisions={[] as any}
        />
      </QueryClientProvider>
    );
    await waitFor(() =>
      expect(queryByTestId('lottery-luckies-last-refresh')).toBeNull()
    );
  });

  it('polls every 30s while unresolved and not finalized', async () => {
    jest.useFakeTimers();
    const { findByTestId, unmount } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
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

  it('issues a single prizes fetch on the general luckies tab', async () => {
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    await findByTestId('lottery-luckies-board');
    expect(mockGetLotteryPrizes).toHaveBeenCalledTimes(1);
    expect(mockGetRules).not.toHaveBeenCalled();
  });

  it('with editionDivisionId set issues one prizes fetch and no rules fetch', async () => {
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab
        editionId={1}
        editionDivisionId={2}
        mode="luckies"
        divisions={
          [{ id_edition_division: 2, division_title: 'Learners' }] as any
        }
      />
    );
    await findByTestId('lottery-luckies-board');
    await waitFor(() => {
      expect(mockGetLotteryPrizes).toHaveBeenCalledTimes(1);
    });
    const args = mockGetLotteryPrizes.mock.calls[0][0];
    expect(args.include).toBe('luckies');
    expect(args.edition_division_id).toBe(2);
    expect(args.filters).toEqual({ lottery_id: 3 });
    expect(mockGetRules).not.toHaveBeenCalled();
  });

  it('pending empty phones shows No phone without icon', async () => {
    const fixture = prizeLinesWithLuckiesFixture();
    (fixture.data[0].luckies as any[])[1].drawn_participation.player.phones =
      [];
    mockGetLotteryPrizes.mockResolvedValue(fixture);
    const { findByTestId, queryByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lucky-phone-empty-51')).toHaveTextContent(
      'No phone'
    );
    expect(queryByTestId('lucky-phone-icon-51-0')).toBeNull();
  });

  it('shows Announcing in countdown for pending unannounced luckies', async () => {
    const availableAt = Math.floor(Date.now() / 1000) + 125;
    mockGetLotteryPrizes.mockResolvedValue(
      prizeLinesWithLuckiesFixture([
        pendingUnannouncedLucky({ available_at: availableAt }),
      ])
    );
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    const line = await findByTestId('lucky-primary-ts-60');
    expect(line).toHaveTextContent(/Announcing in/);
    expect(line).toHaveTextContent(/02:0[45]/);
    const children = line.props.children;
    const boldChild = Array.isArray(children)
      ? children.find((c: any) =>
          String(c?.props?.className || '').includes('font-semibold')
        )
      : null;
    expect(boldChild).toBeTruthy();
    expect(getByTestId('lottery-accept-lucky-60')).toBeTruthy();
    expect(getByTestId('lottery-reject-lucky-60')).toBeTruthy();
    expect(
      getByTestId('lottery-accept-lucky-60').props.accessibilityState?.disabled
    ).not.toBe(true);
  });

  it('holds Announcing in 00:00 when available_at is past', async () => {
    mockGetLotteryPrizes.mockResolvedValue(
      prizeLinesWithLuckiesFixture([
        pendingUnannouncedLucky({
          available_at: Math.floor(Date.now() / 1000) - 30,
        }),
      ])
    );
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lucky-primary-ts-60')).toHaveTextContent(
      'Announcing in 00:00'
    );
  });

  it('decreases announce countdown on nowTick', async () => {
    jest.useFakeTimers({ now: new Date('2026-08-16T12:00:00Z') });
    const availableAt = Math.floor(Date.now() / 1000) + 65;
    mockGetLotteryPrizes.mockResolvedValue(
      prizeLinesWithLuckiesFixture([
        pendingUnannouncedLucky({ available_at: availableAt }),
      ])
    );
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lucky-primary-ts-60')).toHaveTextContent(
      /01:0[45]/
    );
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(await findByTestId('lucky-primary-ts-60')).toHaveTextContent(
      /01:0[34]/
    );
  });

  it('shows Announced primary when announced; no Announcing for accepted', async () => {
    const { findByTestId, queryByText } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lucky-primary-ts-51')).toHaveTextContent(
      /Announced/
    );
    expect(queryByText(/Announcing in/)).toBeNull();
    expect(await findByTestId('lucky-primary-ts-50')).toHaveTextContent(
      /Accepted/
    );
  });

  it('falls back to Drawn when available_at missing on pending unannounced', async () => {
    mockGetLotteryPrizes.mockResolvedValue(
      prizeLinesWithLuckiesFixture([
        pendingUnannouncedLucky({
          available_at: null,
          drawn_at: 42,
        }),
      ])
    );
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lucky-primary-ts-60')).toHaveTextContent(
      /Drawn/
    );
  });

  it('confirm cancel leaves Accept/Reject labels and skips mutation', async () => {
    (window as any).confirm = jest.fn(() => false);
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    await findByTestId('lottery-accept-lucky-51');
    fireEvent.press(getByTestId('lottery-accept-lucky-51'));
    expect(mockAccept).not.toHaveBeenCalled();
    expect(getByTestId('lottery-accept-lucky-51')).toHaveTextContent('Accept');
    expect(getByTestId('lottery-reject-lucky-51')).toHaveTextContent('Reject');
  });

  it('confirm accept shows Accept... and grays both until resolve', async () => {
    let resolveAccept: (v: unknown) => void = () => {};
    mockAccept.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveAccept = resolve;
        })
    );
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    await findByTestId('lottery-accept-lucky-51');
    fireEvent.press(getByTestId('lottery-accept-lucky-51'));
    await waitFor(() =>
      expect(getByTestId('lottery-accept-lucky-51')).toHaveTextContent(
        'Accept...'
      )
    );
    expect(getByTestId('lottery-reject-lucky-51')).toHaveTextContent('Reject');
    expect(
      String(getByTestId('lottery-accept-lucky-51').props.className)
    ).toContain('bg-gray-300');
    expect(
      String(getByTestId('lottery-reject-lucky-51').props.className)
    ).toContain('bg-gray-300');
    expect(
      getByTestId('lottery-accept-lucky-51').props.accessibilityState?.disabled
    ).toBe(true);
    expect(
      getByTestId('lottery-reject-lucky-51').props.accessibilityState?.disabled
    ).toBe(true);

    await act(async () => {
      resolveAccept({});
    });
    await waitFor(() =>
      expect(getByTestId('lottery-accept-lucky-51')).toHaveTextContent('Accept')
    );
  });

  it('confirm reject shows Reject... and grays both until resolve', async () => {
    let resolveReject: (v: unknown) => void = () => {};
    mockReject.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveReject = resolve;
        })
    );
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    await findByTestId('lottery-reject-lucky-51');
    fireEvent.press(getByTestId('lottery-reject-lucky-51'));
    await waitFor(() =>
      expect(getByTestId('lottery-reject-lucky-51')).toHaveTextContent(
        'Reject...'
      )
    );
    expect(
      String(getByTestId('lottery-accept-lucky-51').props.className)
    ).toContain('bg-gray-300');
    await act(async () => {
      resolveReject({});
    });
    await waitFor(() =>
      expect(getByTestId('lottery-reject-lucky-51')).toHaveTextContent('Reject')
    );
  });

  it('finalized Accept/Reject are gray disabled without ellipsis', async () => {
    const { findByTestId, getByTestId } = renderWithClient(
      <EditionLotteryTab
        editionId={1}
        mode="luckies"
        editionFinalized
        divisions={[] as any}
      />
    );
    await findByTestId('lottery-accept-lucky-51');
    expect(getByTestId('lottery-accept-lucky-51')).toHaveTextContent('Accept');
    expect(getByTestId('lottery-reject-lucky-51')).toHaveTextContent('Reject');
    expect(
      String(getByTestId('lottery-accept-lucky-51').props.className)
    ).toContain('bg-gray-300');
    expect(
      getByTestId('lottery-accept-lucky-51').props.accessibilityState?.disabled
    ).toBe(true);
  });

  it('renders one group for a prize line that already merged two luckies', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 20,
          prize: { name: 'Towel' },
          sponsor: null,
          rule_prize_quantity_total: 5,
          luckies: [
            { id_lucky: 50, accepted_at: 1, rejected_at: null, lottery_rule: { edition_division_id: 2 } },
            { id_lucky: 51, accepted_at: null, rejected_at: null, lottery_rule: { edition_division_id: 2 } },
          ],
        },
      ],
      meta: { has_unresolved_pending: true },
    });
    const { findByTestId, getAllByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lucky-group-20')).toBeTruthy();
    expect(await findByTestId('lucky-group-header-20')).toHaveTextContent(
      'Towel × 5'
    );
    expect(getAllByTestId(/lucky-group-header-/)).toHaveLength(1);
    expect(await findByTestId('lottery-lucky-card-50')).toBeTruthy();
    expect(await findByTestId('lottery-lucky-card-51')).toBeTruthy();
  });

  it('uses prize · sponsor × qty in the group header', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 20,
          prize: { name: 'Towel' },
          sponsor: { name: 'Acme' },
          rule_prize_quantity_total: 2,
          luckies: [],
        },
      ],
      meta: { has_unresolved_pending: false },
    });
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
    );
    expect(await findByTestId('lucky-group-header-20')).toHaveTextContent(
      'Towel · Acme × 2'
    );
  });

  it('card division comes from lottery_rule, not participation', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 20,
          prize: { name: 'Towel' },
          rule_prize_quantity_total: 1,
          luckies: [
            {
              id_lucky: 50,
              accepted_at: 1,
              rejected_at: null,
              lottery_rule: { edition_division_id: 2 },
              drawn_participation: { edition_division_id: 9 },
            },
            {
              id_lucky: 70,
              accepted_at: 1,
              rejected_at: null,
              lottery_rule: { edition_division_id: null },
              drawn_participation: { edition_division_id: 2 },
            },
          ],
        },
      ],
      meta: { has_unresolved_pending: false },
    });
    const { findByTestId } = renderWithClient(
      <EditionLotteryTab
        editionId={1}
        mode="luckies"
        divisions={
          [{ id_edition_division: 2, division_title: 'Learners' }] as any
        }
      />
    );
    expect(await findByTestId('lucky-header-50')).toHaveTextContent(
      'Lucky #50 · Learners'
    );
    expect(await findByTestId('lucky-header-70')).toHaveTextContent(
      'Lucky #70 · General'
    );
  });

  it('does not poll when has_unresolved_pending is false', async () => {
    jest.useFakeTimers();
    mockGetLotteryPrizes.mockResolvedValue({
      ...prizeLinesWithLuckiesFixture(),
      meta: { current_page: 1, has_unresolved_pending: false },
    });
    const { findByTestId, queryByTestId, unmount } = renderWithClient(
      <EditionLotteryTab editionId={1} mode="luckies" divisions={[] as any} />
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
