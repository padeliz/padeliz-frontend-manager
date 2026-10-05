import EventLotteryPicker from '@/components/events/lottery/EventLotteryPicker';
import LotteryEmptyState from '@/components/events/lottery/lotteryShared';
import LotteryPrizesMode from '@/components/events/lottery/LotteryPrizesMode';
import {
  PageChromeProvider,
  usePageChrome,
} from '@/components/chrome/PageChromeProvider';
import { queryKeys } from '@/lib/queryClient';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform, Text, View } from 'react-native';
import fs from 'fs';
import path from 'path';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockOpen = jest.fn();
let mockSearchParams: Record<string, string | undefined> = {};
let mockGlobalParams: Record<string, string | undefined> = {};
const mockGetLotteries = jest.fn();
const mockGetLotteryPrizes = jest.fn();
const mockCreateLotteryPrize = jest.fn(async () => ({ data: {} }));
const mockPatchLotteryPrize = jest.fn(async () => ({ data: {} }));
const mockDeleteLotteryPrize = jest.fn(async () => undefined);
const mockReorderLotteryPrizes = jest.fn(async () => ({ data: [] }));
const mockGetPrizes = jest.fn(async () => ({
  data: [{ id_prize: 1, name: 'Racket', media_path: null }],
}));
const mockGetSponsors = jest.fn(async () => ({
  data: [{ id_sponsor: 5, name: 'Acme' }],
}));
const mockPrizesBoard = jest.fn();

jest.mock('@/components/ui/Tooltip', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({
      content,
      children,
      testID,
    }: {
      content: string;
      children: React.ReactNode;
      testID?: string;
    }) => (
      <View testID={testID}>
        <Text testID={testID ? `${testID}-tooltip` : 'tooltip-content'}>
          {content}
        </Text>
        {children}
      </View>
    ),
  };
});

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    usePathname: () => '/events/1/lottery/prizes',
    useLocalSearchParams: () => mockSearchParams,
    useGlobalSearchParams: () => mockGlobalParams,
  })
);

jest.mock('@/services/api/eventLotteriesApi', () => ({
  EventLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: (...args: unknown[]) => mockGetLotteries(...args),
  })),
}));

jest.mock('@/services/api/eventLotteryPrizesApi', () => ({
  EventLotteryPrizesApiService: jest.fn().mockImplementation(() => ({
    getLotteryPrizes: (...args: unknown[]) => mockGetLotteryPrizes(...args),
    createLotteryPrize: (...args: unknown[]) => mockCreateLotteryPrize(...args),
    patchLotteryPrize: (...args: unknown[]) => mockPatchLotteryPrize(...args),
    deleteLotteryPrize: (...args: unknown[]) => mockDeleteLotteryPrize(...args),
    reorderLotteryPrizes: (...args: unknown[]) =>
      mockReorderLotteryPrizes(...args),
  })),
}));

jest.mock('@/services/api/prizesApi', () => ({
  PrizesApiService: jest.fn().mockImplementation(() => ({
    getPrizes: (...args: unknown[]) => mockGetPrizes(...args),
  })),
}));

jest.mock('@/services/api/sponsorsApi', () => ({
  SponsorsApiService: jest.fn().mockImplementation(() => ({
    getSponsors: (...args: unknown[]) => mockGetSponsors(...args),
  })),
}));

jest.mock('@/services/api/lotteryLiveApi', () => ({
  lotteryLiveApi: {
    prizesBoard: (...args: unknown[]) => mockPrizesBoard(...args),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>{ui}</PageChromeProvider>
      </QueryClientProvider>
    ),
  };
}

/** Mirrors EventChromeHeaderActions Save enablement (canSave && isDirty). */
function EventChromeSaveGateProbe({
  renderCountRef,
}: {
  renderCountRef?: { current: number };
}) {
  if (renderCountRef) renderCountRef.current += 1;
  const { actions } = usePageChrome();
  const canSave = !!actions?.canSave && !!actions?.isDirty;
  return (
    <Text testID="header-save-disabled">
      {canSave ? 'enabled' : 'disabled'}
    </Text>
  );
}


function PrizesContentProbe({
  renderCountRef,
  children,
}: {
  renderCountRef: { current: number };
  children: React.ReactNode;
}) {
  renderCountRef.current += 1;
  return (
    <View>
      <Text testID="prizes-content-renders">
        {String(renderCountRef.current)}
      </Text>
      {children}
    </View>
  );
}

describe('EventLotteryPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    mockGlobalParams = {};
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    (global as any).window = {
      ...(global as any).window,
      open: mockOpen,
      confirm: jest.fn(() => true),
      location: { origin: 'http://localhost' },
    };
    mockGetLotteries.mockResolvedValue({
      data: [
        { id_lottery: 9, name: 'Zebra Draw', display_order: 2, has_luckies: false },
        { id_lottery: 3, name: 'Alpha Draw', display_order: 0, has_luckies: false },
      ],
    });
  });

  afterEach(() => cleanup());

  it('does not auto-sync URL when multiple lotteries exist', async () => {
    renderWithClient(<EventLotteryPicker eventId={1} />);
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not auto-sync URL when exactly one lottery exists', async () => {
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, name: 'Only', display_order: 0, has_luckies: false }],
    });
    renderWithClient(<EventLotteryPicker eventId={1} />);
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows the only lottery selected without ?lottery= (derived)', async () => {
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, name: 'Only', display_order: 0, has_luckies: false }],
    });
    const { findByText, queryByText } = renderWithClient(
      <EventLotteryPicker eventId={1} />
    );
    expect(await findByText('Only')).toBeTruthy();
    expect(queryByText('Select lottery')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not auto-sync URL when URL has invalid ?lottery=', async () => {
    mockSearchParams = { lottery: '99' };
    renderWithClient(<EventLotteryPicker eventId={1} />);
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not auto-sync when list is empty but URL has lottery', async () => {
    mockSearchParams = { lottery: '99' };
    mockGetLotteries.mockResolvedValue({ data: [] });
    renderWithClient(<EventLotteryPicker eventId={1} />);
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows No lotteries when zero lotteries', async () => {
    mockGetLotteries.mockResolvedValue({ data: [] });
    const { findByTestId, findByText } = renderWithClient(
      <EventLotteryPicker eventId={1} />
    );
    expect(await findByTestId('event-lottery-picker')).toBeTruthy();
    expect(await findByText('No lotteries')).toBeTruthy();
  });

  it('shows View all when zero lotteries', async () => {
    mockGetLotteries.mockResolvedValue({ data: [] });
    const { findByText, getByTestId } = renderWithClient(
      <EventLotteryPicker eventId={1} />
    );
    fireEvent.press(await findByText('No lotteries'));
    fireEvent.press(getByTestId('lottery-picker-view-all'));
    expect(mockOpen).toHaveBeenCalledWith(
      '/event-lotteries',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('View all footer opens plain /event-lotteries', async () => {
    const { findByText, getByTestId } = renderWithClient(
      <EventLotteryPicker eventId={1} />
    );
    fireEvent.press(await findByText('Select lottery'));
    fireEvent.press(getByTestId('lottery-picker-view-all'));
    expect(mockOpen).toHaveBeenCalledWith(
      '/event-lotteries',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('updates ?lottery= when picker changes', async () => {
    const { findByText, getByText } = renderWithClient(
      <EventLotteryPicker eventId={1} />
    );
    fireEvent.press(await findByText('Select lottery'));
    fireEvent.press(getByText('Alpha Draw'));
    expect(mockReplace).toHaveBeenCalledWith(
      '/events/1/lottery/prizes?lottery=3'
    );
  });

  it('preserves ?ed= when picker changes', async () => {
    mockSearchParams = { ed: '9' };
    const { findByText, getByText } = renderWithClient(
      <EventLotteryPicker eventId={1} />
    );
    fireEvent.press(await findByText('Select lottery'));
    fireEvent.press(getByText('Alpha Draw'));
    expect(mockReplace).toHaveBeenCalledWith(
      '/events/1/lottery/prizes?ed=9&lottery=3'
    );
  });

  it('does not parse ed via parseLotteryId', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'EventLotteryPicker.tsx'),
      'utf8'
    );
    expect(src).not.toContain('parseLotteryId(edParam)');
  });

  it('does not replace when local lottery is valid and global disagrees', async () => {
    mockSearchParams = { lottery: '3' };
    mockGlobalParams = { lottery: '99' };
    renderWithClient(<EventLotteryPicker eventId={1} />);
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows selection from global lottery without auto-replace (chrome)', async () => {
    mockSearchParams = {};
    mockGlobalParams = { lottery: '3' };
    const { findByText, queryByText } = renderWithClient(
      <EventLotteryPicker eventId={1} />
    );
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
    expect(await findByText('Alpha Draw')).toBeTruthy();
    expect(queryByText('Select lottery')).toBeNull();
  });

  it('does not clear invalid global lottery from the picker', async () => {
    mockSearchParams = {};
    mockGlobalParams = { lottery: '99' };
    renderWithClient(<EventLotteryPicker eventId={1} />);
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('memoizes edKeep and has no URL sync useEffect', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'EventLotteryPicker.tsx'),
      'utf8'
    );
    expect(src).toMatch(/edKeep\s*=\s*useMemo/);
    expect(src).not.toMatch(/\blotteryParam\b/);
    expect(src).not.toMatch(/useEffect\s*\(/);
  });
});

describe('lottery param source order', () => {
  it('lottery layout prefers local ed over global', () => {
    const src = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'app',
        '(app)',
        'events',
        '[id]',
        'lottery',
        '_layout.tsx'
      ),
      'utf8'
    );
    expect(src).toContain(
      'const edParam = localParams.ed ?? globalParams.ed'
    );
  });

  it('EventDetailChrome reads lottery local-first then global', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'EventDetailChrome.tsx'),
      'utf8'
    );
    expect(src).toContain(
      'const lotteryParam = localParams.lottery ?? globalParams.lottery'
    );
    expect(src).toContain(
      'const edParam = localParams.ed ?? globalParams.ed'
    );
    expect(src).not.toContain(
      'globalParams.lottery ?? localParams.lottery'
    );
  });
});

describe('LotteryPrizesMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = { lottery: '3' };
    mockGlobalParams = {};
    (window as any).confirm = jest.fn(() => true);
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, name: 'Alpha', has_luckies: false }],
    });
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 11,
          lottery_id: 3,
          prize_id: 1,
          prize_quantity: 2,
          rules_count: 0,
          rule_prize_quantity_total: 2,
          display_order: 0,
          prize: { name: 'Racket', media_path: null },
          sponsor: { name: 'Acme' },
        },
      ],
    });
  });

  afterEach(() => cleanup());

  it('shows empty state helper when no lottery selected', () => {
    const { getByTestId } = render(<LotteryEmptyState />);
    expect(getByTestId('lottery-select-empty')).toBeTruthy();
  });

  it('lists prize lines with name, qty, and sponsor columns', async () => {
    const { findByTestId, queryByTestId } = renderWithClient(
      <LotteryPrizesMode eventId={1} lotteryId={3} />
    );
    expect(await findByTestId('lottery-prize-name-11')).toHaveTextContent(
      'Racket'
    );
    expect(await findByTestId('lottery-prize-name-11')).not.toHaveTextContent(
      'Acme'
    );
    expect(await findByTestId('lottery-prize-qty-11')).toHaveTextContent(
      'qty 2'
    );
    expect(await findByTestId('lottery-prize-sponsor-11')).toHaveTextContent(
      'Acme'
    );
    expect(mockPrizesBoard).not.toHaveBeenCalled();
    expect(queryByTestId('lottery-delete-lottery')).toBeNull();
    expect(queryByTestId('lottery-link-lotteries')).toBeNull();
    expect(mockGetLotteryPrizes.mock.calls[0][0]).not.toHaveProperty(
      'event_division_id'
    );
  });

  it('shows em dash when sponsor is missing', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 11,
          lottery_id: 3,
          prize_id: 1,
          prize_quantity: 2,
          rules_count: 0,
          rule_prize_quantity_total: 2,
          display_order: 0,
          prize: { name: 'Racket', media_path: null },
          sponsor: null,
        },
      ],
    });
    const { findByTestId } = renderWithClient(
      <LotteryPrizesMode eventId={1} lotteryId={3} />
    );
    expect(await findByTestId('lottery-prize-sponsor-11')).toHaveTextContent(
      '—'
    );
  });

  it('uses Storage url for prize thumb, not relative media_path', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 11,
          lottery_id: 3,
          prize_id: 1,
          prize_quantity: 2,
          rules_count: 0,
          rule_prize_quantity_total: 2,
          display_order: 0,
          prize: {
            name: 'Racket',
            media_path: 'prizes/1/media/x.png',
            url: '/storage/prizes/1/media/x.png',
          },
          sponsor: { name: 'Acme' },
        },
      ],
    });
    const { findByTestId } = renderWithClient(
      <LotteryPrizesMode eventId={1} lotteryId={3} />
    );
    const thumb = await findByTestId('lottery-prize-thumb');
    const img = thumb.findAll(
      (n: { props?: { source?: { uri?: string } } }) =>
        typeof n?.props?.source?.uri === 'string'
    )[0];
    expect(img?.props?.source?.uri).toBe(
      'http://localhost:8000/storage/prizes/1/media/x.png'
    );
    expect(img?.props?.source?.uri.startsWith('/prizes/')).toBe(false);
  });

  it('omits video urls from prize catalog dropdown imageUrl', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'LotteryPrizesMode.tsx'),
      'utf8'
    );
    expect(src).toContain('media.isVideo ? null : media.url');
  });

  it('shows mismatch warning when qty totals differ', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 11,
          lottery_id: 3,
          prize_id: 1,
          prize_quantity: 5,
          rules_count: 1,
          rule_prize_quantity_total: 2,
          prize: { name: 'Racket' },
          sponsor: null,
        },
      ],
    });
    const { findByTestId } = renderWithClient(
      <LotteryPrizesMode eventId={1} lotteryId={3} />
    );
    expect(await findByTestId('lottery-prize-mismatch-11')).toBeTruthy();
    expect(await findByTestId('lottery-prize-mismatch-11-tooltip')).toHaveTextContent(
      'Prize quantity (5) does not match total rule quantity (2).'
    );
  });

  it('disables delete when rules_count > 0', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 11,
          lottery_id: 3,
          prize_id: 1,
          prize_quantity: 2,
          rules_count: 2,
          rule_prize_quantity_total: 2,
          prize: { name: 'Racket' },
          sponsor: null,
        },
      ],
    });
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryPrizesMode eventId={1} lotteryId={3} />
    );
    await findByTestId('lottery-delete-prize-11');
    expect(
      getByTestId('lottery-delete-prize-11').props.accessibilityState?.disabled
    ).toBe(true);
  });

  it('disables edit when has_luckies and still allows add', async () => {
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, name: 'Alpha', has_luckies: true }],
    });
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryPrizesMode eventId={1} lotteryId={3} hasLuckies />
    );
    await findByTestId('lottery-edit-prize-11');
    expect(
      getByTestId('lottery-edit-prize-11').props.accessibilityState?.disabled
    ).toBe(true);
    expect(
      getByTestId('lottery-delete-prize-11').props.accessibilityState?.disabled
    ).toBe(true);
    expect(
      getByTestId('lottery-prize-add-button').props.accessibilityState?.disabled
    ).toBe(false);
  });

  it('disables add/edit/delete when finalized', async () => {
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryPrizesMode eventId={1} lotteryId={3} eventFinalized />
    );
    await findByTestId('lottery-finalized-hint');
    expect(getByTestId('lottery-edit-prize-11').props.accessibilityState?.disabled).toBe(
      true
    );
    expect(
      getByTestId('lottery-delete-prize-11').props.accessibilityState?.disabled
    ).toBe(true);
  });

  it('query key for prizes is lottery-scoped only', () => {
    expect(queryKeys.eventLotteryPrizes(3)).toEqual([
      'eventLotteryPrizes',
      3,
    ]);
    expect(queryKeys.eventLotteryRules(3)).toEqual([
      'eventLotteryRules',
      3,
    ]);
    expect(queryKeys.eventLotteryPrizesWithLuckies(3)).toEqual([
      'eventLotteryPrizesWithLuckies',
      3,
    ]);
  });

  it('setQueryData does not hit max update depth; Save settles disabled', async () => {
    const contentRenders = { current: 0 };
    const chromeLeafRenders = { current: 0 };
    const prizeLine = {
      id_lottery_prize: 11,
      lottery_id: 3,
      prize_id: 1,
      prize_quantity: 2,
      rules_count: 0,
      rule_prize_quantity_total: 2,
      display_order: 0,
      prize: { name: 'Racket', media_path: null },
      sponsor: { name: 'Acme' },
    };

    const { client, findByTestId, getByTestId } = renderWithClient(
      <>
        <EventChromeSaveGateProbe renderCountRef={chromeLeafRenders} />
        <PrizesContentProbe renderCountRef={contentRenders}>
          <LotteryPrizesMode eventId={1} lotteryId={3} />
        </PrizesContentProbe>
      </>
    );

    expect(await findByTestId('lottery-prize-line-11')).toBeTruthy();
    await waitFor(() => {
      expect(getByTestId('header-save-disabled').props.children).toBe(
        'disabled'
      );
    });
    const afterSync = Number(getByTestId('prizes-content-renders').props.children);
    const chromeAfterSync = chromeLeafRenders.current;

    await act(async () => {
      client.setQueryData(queryKeys.eventLotteryPrizes(3), [
        { ...prizeLine },
      ]);
    });

    await waitFor(() => {
      expect(getByTestId('header-save-disabled').props.children).toBe(
        'disabled'
      );
    });
    expect(
      Number(getByTestId('prizes-content-renders').props.children)
    ).toBeLessThan(afterSync + 20);
    expect(chromeLeafRenders.current).toBeLessThan(chromeAfterSync + 20);
  });

  it('query-sync setLocal bails out when id-order is unchanged', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'LotteryPrizesMode.tsx'),
      'utf8'
    );
    expect(src).toContain('samePrizeIdOrder');
    expect(src).toMatch(
      /setLocal\(prev =>\s*samePrizeIdOrder\(prev, next\) && prev\.every/
    );
  });

  it('edit pencil uses gray iconColor on transparent ghost', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'LotteryPrizesMode.tsx'),
      'utf8'
    );
    expect(src).toMatch(
      /startIcon="pencil"[\s\S]*?iconColor="#4b5563"/
    );
  });

  it('edit-mode save/cancel use green and gray iconColors', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'LotteryPrizesMode.tsx'),
      'utf8'
    );
    expect(src).toMatch(
      /startIcon="checkmark"[\s\S]*?iconColor="#15803d"/
    );
    expect(src).toMatch(
      /startIcon="close"[\s\S]*?iconColor="#4b5563"/
    );
  });

  it('same-order setQueryData keeps chrome clean', async () => {
    const chromeLeafRenders = { current: 0 };
    const prizeLine = {
      id_lottery_prize: 11,
      lottery_id: 3,
      prize_id: 1,
      prize_quantity: 2,
      rules_count: 0,
      rule_prize_quantity_total: 2,
      display_order: 0,
      prize: { name: 'Racket', media_path: null },
      sponsor: { name: 'Acme' },
    };
    const lines = [prizeLine];

    const { client, findByTestId, getByTestId } = renderWithClient(
      <>
        <EventChromeSaveGateProbe renderCountRef={chromeLeafRenders} />
        <LotteryPrizesMode eventId={1} lotteryId={3} />
      </>
    );

    expect(await findByTestId('lottery-prize-line-11')).toBeTruthy();
    await waitFor(() => {
      expect(getByTestId('header-save-disabled').props.children).toBe(
        'disabled'
      );
    });
    const chromeAfterSync = chromeLeafRenders.current;

    await act(async () => {
      client.setQueryData(queryKeys.eventLotteryPrizes(3), [...lines]);
    });

    await waitFor(() => {
      expect(getByTestId('header-save-disabled').props.children).toBe(
        'disabled'
      );
    });
    expect(chromeLeafRenders.current).toBeLessThan(chromeAfterSync + 20);
  });
});
