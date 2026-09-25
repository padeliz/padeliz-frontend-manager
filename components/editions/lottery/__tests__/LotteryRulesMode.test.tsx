import LotteryRulesMode from '@/components/editions/lottery/LotteryRulesMode';
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
import { Text } from 'react-native';
import fs from 'fs';
import path from 'path';

const mockGetRules = jest.fn();
const mockDeleteRule = jest.fn(async () => undefined);
const mockCreateRule = jest.fn(async () => ({ data: {} }));
const mockPatchRule = jest.fn(async () => ({ data: {} }));
const mockReorderLotteryRules = jest.fn(async () => ({ data: [] }));
const mockGetLotteryPrizes = jest.fn();
const mockGenerateRules = jest.fn(async () => ({ data: [] }));
const mockGetLotteries = jest.fn();
const mockGetEditionDivisions = jest.fn();

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
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    usePathname: () => '/editions/1/lottery/rules',
    useLocalSearchParams: () => ({ lottery: '3' }),
    useGlobalSearchParams: () => ({ lottery: '3' }),
  })
);

jest.mock('@/services/api/editionLotteryRulesApi', () => ({
  EditionLotteryRulesApiService: jest.fn().mockImplementation(() => ({
    getRules: (...args: unknown[]) => mockGetRules(...args),
    deleteRule: (...args: unknown[]) => mockDeleteRule(...args),
    createRule: (...args: unknown[]) => mockCreateRule(...args),
    patchRule: (...args: unknown[]) => mockPatchRule(...args),
    reorderLotteryRules: (...args: unknown[]) =>
      mockReorderLotteryRules(...args),
  })),
}));

jest.mock('@/services/api/editionLotteryPrizesApi', () => ({
  EditionLotteryPrizesApiService: jest.fn().mockImplementation(() => ({
    getLotteryPrizes: (...args: unknown[]) => mockGetLotteryPrizes(...args),
  })),
}));

jest.mock('@/services/api/editionLotteriesApi', () => ({
  EditionLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: (...args: unknown[]) => mockGetLotteries(...args),
    generateRules: (...args: unknown[]) => mockGenerateRules(...args),
  })),
}));

jest.mock('@/services/api/editionDivisionsApi', () => ({
  EditionDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEditionDivisions: (...args: unknown[]) =>
      mockGetEditionDivisions(...args),
  })),
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

function HeaderSaveProbe() {
  const { actions } = usePageChrome();
  const canSave =
    !!actions?.canSave && !!actions?.isDirty && !actions?.isEditing;
  return (
    <Text testID="header-save-disabled">
      {canSave ? 'enabled' : 'disabled'}
    </Text>
  );
}

const rulesFixture = () => ({
  data: [
    {
      id_lottery_rule: 8,
      lottery_prize_id: 20,
      edition_division_id: 2,
      rule_prize_quantity: 1,
      orderliness: 0,
      luckies_count: 0,
      lottery_prize: {
        id_lottery_prize: 20,
        prize_quantity: 2,
        prize: { name: 'Mug' },
      },
    },
    {
      id_lottery_rule: 7,
      lottery_prize_id: 20,
      edition_division_id: 2,
      rule_prize_quantity: 1,
      orderliness: 1,
      luckies_count: 0,
      lottery_prize: {
        id_lottery_prize: 20,
        prize_quantity: 2,
        prize: { name: 'Mug' },
      },
    },
  ],
});

describe('LotteryRulesMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).confirm = jest.fn(() => true);
    mockGetRules.mockResolvedValue(rulesFixture());
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 20,
          lottery_id: 3,
          prize_id: 1,
          prize_quantity: 2,
          rule_prize_quantity_total: 2,
          prize: { name: 'Mug' },
        },
      ],
    });
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, has_luckies: false }],
    });
    mockGetEditionDivisions.mockResolvedValue({
      data: [
        {
          id_edition_division: 2,
          division_title: 'Learners',
          division: { name: 'Learners', color: '#abcdef' },
        },
      ],
    });
  });

  afterEach(() => cleanup());

  it('lists rules flat by orderliness without ED in fetch', async () => {
    const { findByTestId, queryByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    expect(await findByTestId('lottery-rule-row-8')).toBeTruthy();
    expect(await findByTestId('lottery-rule-row-7')).toBeTruthy();
    expect(await findByTestId('lottery-rule-name-8')).toHaveTextContent('Mug');
    expect(await findByTestId('lottery-rule-qty-8')).toHaveTextContent('qty 1');
    expect(await findByTestId('lottery-rule-sponsor-8')).toHaveTextContent('—');
    expect(await findByTestId('lottery-rule-division-8')).toBeTruthy();
    const args = mockGetRules.mock.calls[0][0];
    expect(args.filters).toEqual({ lottery_id: 3 });
    expect(args.filters.edition_division_id).toBeUndefined();
    expect(queryByTestId('lottery-link-rules')).toBeNull();
  });

  it('shows sponsor column from lottery_prize on rules', async () => {
    mockGetRules.mockResolvedValue({
      data: [
        {
          id_lottery_rule: 8,
          lottery_prize_id: 20,
          edition_division_id: 2,
          rule_prize_quantity: 1,
          orderliness: 0,
          luckies_count: 0,
          lottery_prize: {
            id_lottery_prize: 20,
            prize_quantity: 2,
            prize: { name: 'Mug' },
            sponsor: { name: 'Nike' },
          },
        },
      ],
    });
    const { findByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    expect(await findByTestId('lottery-rule-name-8')).toHaveTextContent('Mug');
    expect(await findByTestId('lottery-rule-name-8')).not.toHaveTextContent(
      'Nike'
    );
    expect(await findByTestId('lottery-rule-sponsor-8')).toHaveTextContent(
      'Nike'
    );
  });

  it('shows mismatch on every rule row of a mismatched prize line', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 20,
          prize_quantity: 5,
          rule_prize_quantity_total: 2,
          prize: { name: 'Mug' },
        },
      ],
    });
    const { findByTestId, findAllByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    expect(await findByTestId('lottery-rule-mismatch-7')).toBeTruthy();
    expect(await findByTestId('lottery-rule-mismatch-8')).toBeTruthy();
    const tooltips = await findAllByTestId(/lottery-rule-mismatch-\d+-tooltip/);
    expect(tooltips.length).toBeGreaterThanOrEqual(2);
    expect(tooltips[0]).toHaveTextContent(
      'Prize quantity (5) does not match total rule quantity (2).'
    );
  });

  it('uses Storage url for rule prize thumb, not relative media_path', async () => {
    mockGetRules.mockResolvedValue({
      data: [
        {
          id_lottery_rule: 8,
          lottery_prize_id: 20,
          edition_division_id: 2,
          rule_prize_quantity: 1,
          orderliness: 0,
          luckies_count: 0,
          lottery_prize: {
            id_lottery_prize: 20,
            prize_quantity: 2,
            prize: {
              name: 'Mug',
              media_path: 'prizes/1/media/x.png',
              url: '/storage/prizes/1/media/x.png',
            },
          },
        },
      ],
    });
    const { findByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    const thumb = await findByTestId('lottery-rule-prize-thumb');
    const img = thumb.findAll(
      (n: { props?: { source?: { uri?: string } } }) =>
        typeof n?.props?.source?.uri === 'string'
    )[0];
    expect(img?.props?.source?.uri).toBe(
      'http://localhost:8000/storage/prizes/1/media/x.png'
    );
    expect(img?.props?.source?.uri.startsWith('/prizes/')).toBe(false);
  });

  it('shows Recreate rules when rules exist', async () => {
    const { findByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    expect(await findByTestId('lottery-rules-generate')).toHaveTextContent(
      'Recreate rules'
    );
  });

  it('shows Generate rules when empty', async () => {
    mockGetRules.mockResolvedValue({ data: [] });
    const { findByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    expect(await findByTestId('lottery-rules-generate')).toHaveTextContent(
      'Generate rules'
    );
  });

  it('generate confirms wipe and calls API', async () => {
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    await findByTestId('lottery-rules-generate');
    fireEvent.press(getByTestId('lottery-rules-generate'));
    await waitFor(() => expect(mockGenerateRules).toHaveBeenCalledWith(3));
  });

  it('disables generate when has_luckies', async () => {
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, has_luckies: true }],
    });
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} hasLuckies />
    );
    await findByTestId('lottery-rules-generate');
    expect(
      getByTestId('lottery-rules-generate').props.accessibilityState?.disabled
    ).toBe(true);
  });

  it('disables edit/delete only when that rule has luckies_count > 0', async () => {
    mockGetRules.mockResolvedValue({
      data: [
        {
          id_lottery_rule: 7,
          lottery_prize_id: 20,
          edition_division_id: 2,
          rule_prize_quantity: 1,
          orderliness: 0,
          luckies_count: 2,
          lottery_prize: { prize: { name: 'Mug' } },
        },
        {
          id_lottery_rule: 8,
          lottery_prize_id: 20,
          edition_division_id: 2,
          rule_prize_quantity: 1,
          orderliness: 1,
          luckies_count: 0,
          lottery_prize: { prize: { name: 'Mug' } },
        },
      ],
    });
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, has_luckies: true }],
    });
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} hasLuckies />
    );
    await findByTestId('lottery-edit-rule-7');
    expect(
      getByTestId('lottery-edit-rule-7').props.accessibilityState?.disabled
    ).toBe(true);
    expect(
      getByTestId('lottery-delete-rule-7').props.accessibilityState?.disabled
    ).toBe(true);
    expect(
      getByTestId('lottery-edit-rule-8').props.accessibilityState?.disabled
    ).toBe(false);
  });

  it('deletes a rule after confirmation', async () => {
    const { findByTestId, getByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    await findByTestId('lottery-delete-rule-7');
    fireEvent.press(getByTestId('lottery-delete-rule-7'));
    await waitFor(() => expect(mockDeleteRule).toHaveBeenCalledWith(7));
  });

  it('shows mismatch when prize qty differs from rule totals', async () => {
    mockGetLotteryPrizes.mockResolvedValue({
      data: [
        {
          id_lottery_prize: 20,
          prize_quantity: 5,
          rule_prize_quantity_total: 2,
          prize: { name: 'Mug' },
        },
      ],
    });
    const { findByTestId } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    expect(await findByTestId('lottery-rule-mismatch-7')).toBeTruthy();
    expect(
      await findByTestId('lottery-rule-mismatch-7-tooltip')
    ).toHaveTextContent(
      'Prize quantity (5) does not match total rule quantity (2).'
    );
  });

  it('does not render demographic fields in the add form', async () => {
    const { findByTestId, queryByText } = renderWithClient(
      <LotteryRulesMode editionId={1} lotteryId={3} />
    );
    await findByTestId('lottery-rules-add-form');
    expect(queryByText(/gender/i)).toBeNull();
    expect(queryByText(/social/i)).toBeNull();
    expect(queryByText(/legal age/i)).toBeNull();
  });

  it('query-sync setLocal bails out when id-order is unchanged', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'LotteryRulesMode.tsx'),
      'utf8'
    );
    expect(src).toContain('sameRuleIdOrder');
    expect(src).toMatch(
      /setLocal\(prev =>\s*sameRuleIdOrder\(prev, next\) && prev\.every/
    );
  });

  it('edit pencil uses gray iconColor on transparent ghost', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'LotteryRulesMode.tsx'),
      'utf8'
    );
    expect(src).toMatch(
      /startIcon="pencil"[\s\S]*?iconColor="#4b5563"/
    );
  });

  it('edit-mode save/cancel use green and gray iconColors', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'LotteryRulesMode.tsx'),
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
    const fixture = rulesFixture().data;

    const { client, findByTestId, getByTestId } = renderWithClient(
      <>
        <HeaderSaveProbe />
        <LotteryRulesMode editionId={1} lotteryId={3} />
      </>
    );

    expect(await findByTestId('lottery-rule-row-8')).toBeTruthy();
    await waitFor(() => {
      expect(getByTestId('header-save-disabled').props.children).toBe(
        'disabled'
      );
    });

    await act(async () => {
      client.setQueryData(queryKeys.editionLotteryRules(3), [...fixture]);
    });

    await waitFor(() => {
      expect(getByTestId('header-save-disabled').props.children).toBe(
        'disabled'
      );
    });
  });
});
